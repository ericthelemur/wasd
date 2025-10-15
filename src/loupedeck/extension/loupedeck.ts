import Canvas from 'canvas';
import drawText, { DrawOptions } from 'node-canvas-text';
import opentype from 'opentype.js';
import { endianness } from 'os';
import { BackpackFill } from 'react-bootstrap-icons';

import {
    listLoupedecks, LoupedeckBufferFormat, LoupedeckControlInfo, LoupedeckControlType,
    LoupedeckDevice, LoupedeckDisplayId, LoupedeckTouchEventData, openLoupedeck
} from '@ericthelemur/node';
import NodeCG from '@nodecg/types';

import { CommPoint, Messages, Replicants } from '../../common/commpoint/commpoint';
import { addExitTask } from '../../common/exit-hooks';
import { getNodeCG, Replicant, sendSuccess } from '../../common/utils';
import { CellData, ConnStatus, LoupeDisplay, LoupeLogin, LoupeStatus } from '../../types/schemas';
import listeners, { ListenerTypes, listenTo, sendTo } from '../messages';

let titleFont: opentype.Font | null = null;
try {
    titleFont = opentype.loadSync('./bundles/wasd/src/common/fonts/Montserrat-Bold.ttf');
} catch (e) {
    console.error("Error loading Montserrat font");
}

export class Loupedeck extends CommPoint<ListenerTypes, LoupeStatus, LoupeLogin, {
    status: NodeCG.ServerReplicantWithSchemaDefault<LoupeStatus>,
    login: NodeCG.ServerReplicantWithSchemaDefault<LoupeLogin>,
    display: NodeCG.ServerReplicantWithSchemaDefault<LoupeDisplay>
}> {
    loupedeck: LoupedeckDevice | null = null;
    currentDisplay: (CellData | null)[] =  [];

    constructor() {
        super("loupedeck", {
            login: Replicant<LoupeLogin>("loupeLogin", "loupedeck"),
            status: Replicant<LoupeStatus>("loupeStatus", "loupedeck"),
            display: Replicant<LoupeDisplay>("loupeDisplay", "loupedeck")
        }, listeners);

        addExitTask(async (err, cb) => await this._disconnect(true).catch(() => { }).then(() => cb()));
    }

    async _connect() {
        if (this.loupedeck) await this.loupedeck.close().catch((e) => this.log.warn("Error closing", e));
        this.loupedeck = null;

        let path;
        if (this.replicants.login.value.path) {
            path = this.replicants.login.value.path;
        } else {
            const loupedecks = await listLoupedecks();
            if (loupedecks && loupedecks.length > 0) {
                path = loupedecks[0].path;
            } else {
                throw "No Loupedecks found";
            }
        }

        if (path) {
            const ld = await openLoupedeck(path)
                .catch((err) => { throw "Failed connecting to Loupedeck" + err });
            if (ld) {
                this.loupedeck = ld;
                this.log.info("Connected to", ld.modelName);
                return;
            }
        }
        throw "Connection Failed";
    }

    async _disconnect(cleanup = false) {
        if (this.loupedeck) {
            if (!cleanup) this.log.info("Disconnecting LD");
            if (!cleanup) await this.loupedeck.blankDevice(true, true).catch(() => { });
            await this.loupedeck.close();
            if (!cleanup) this.log.info("Disconnected LD");
        }
    }

    async isConnected() {
        // If cannot fetch serial number, must be disconnected
        let connected = true;
        await this.loupedeck?.getSerialNumber().catch(() => connected = false);
        return connected;
    }

    async _setupListeners() {
        if (!this.loupedeck) return;
        await this._interactionListeners();

        this.currentDisplay = Array(this.loupedeck.lcdKeyColumns * this.loupedeck.lcdKeyRows).fill(null);

        this.replicants.display.on("change", async newVal => {
            console.log(newVal);
            for (let i = 0; i < this.currentDisplay.length; i++) {
                const newCell = newVal[i], oldCell = this.currentDisplay[i];
                if (newCell === oldCell) continue;  // If equal don't do anything (likely only covers null === null case)

                if (!oldCell || !newCell) {     // If previously empty or setting to empty, draw
                    await this.drawKey(i, newCell).catch(e => this.log.error("Error drawing key", e));
                } else if (newCell.text != oldCell.text || newCell.colour != oldCell.colour || newCell.bg != oldCell.bg || newCell.imgType != oldCell.imgType || newCell.img != oldCell.img) {
                    await this.drawKey(i, newCell).catch(e => this.log.error("Error drawing key", e));;   // If difference in any field, redraw
                }
                this.currentDisplay[i] = newCell;
            }
        })
    }

    async _interactionListeners() {
        if (!this.loupedeck) return;
        this.log.info("Settings up listeners");
        this.loupedeck.blankDevice(true, true).catch(e => this.log.error("Error blanking device", e));

        this.loupedeck.on('down', (info: LoupedeckControlInfo) => {
            // log.info('control down', info)
            if (info.type == LoupedeckControlType.Button) {
                sendTo("buttonDown", { button: info.index });
            } else {
                sendTo("knobDown", { knob: info.index })
            }
        })

        this.loupedeck.on('up', (info) => {
            // log.info('control up', info);
            if (info.type == LoupedeckControlType.Button) {
                sendTo("buttonUp", { button: info.index });
            } else {
                sendTo("knobUp", { knob: info.index })
            }
        })

        this.loupedeck.on('rotate', (info, delta) => {
            // log.info('control rotate', info, delta)
            if (info.type != LoupedeckControlType.Rotary) return;
            sendTo("knobRotate", { knob: info.index, amount: delta });
        })

        const maxWidth = this.loupedeck.displayMain.width, maxHeight = this.loupedeck.displayMain.height;
        function screenTouch(info: LoupedeckTouchEventData, isStart: boolean) {
            // log.info("touch", isStart ? "start" : "end", JSON.stringify(info.changedTouches))
            info.changedTouches.forEach((press) => {
                if (press.x < 0 || press.y < 0) return;
                if (press.x > maxWidth || press.y > maxHeight) return;
                if (press.target.key === undefined) return;

                sendTo(isStart ? "screenDown" : "screenUp", { key: press.target.key });
            })
        }
        this.loupedeck.on("touchstart", info => screenTouch(info, true));
        this.loupedeck.on("touchend", info => screenTouch(info, false));

        this.loupedeck.on('error', (error) => {
            this.log.error(error);
        })
    }



    async drawKey(index: number, content: CellData | null) {
        if (!this.loupedeck || !titleFont) return false;
        this.log.info("Drawing key", index);
        const w = this.loupedeck.lcdKeySize;
        let canvas = Canvas.createCanvas(w, w);
        let ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = content ? (content.bg ? content.bg : "#222222"): "black";
        ctx.fillRect(0, 0, w, w);
        if (!content) {
            this.drawCanvas(index, canvas);
            return;
        };

        // Load and convert SVG to coloured base64 URL
        let img;
        if (content.imgType && content.img) {
            let imgStr = content.img;
            switch (content.imgType) {
                case "svgURL":
                    imgStr = await fetch(content.img).then(r => r.text()).catch(e => {
                        this.log.error(`Error fetching SVG for LD index ${index} from URL ${content.img}`);
                        return "";
                    });
                case "svg": // Fall through
                    const coloured = imgStr.replace("currentColor", content.colour || "white");
                    const b64SVG = Buffer.from(coloured).toString("base64");
                    img = await Canvas.loadImage(`data:image/svg+xml;base64,${b64SVG}`);
                    break;

                case "pngURL":
                    imgStr = await fetch(content.img).then(r => r.text()).catch(e => {
                        this.log.error(`Error fetching SVG for LD index ${index} from URL ${content.img}`);
                        return "";
                    });
                    imgStr = Buffer.from(imgStr).toString("base64");
                case "png":
                    img = await Canvas.loadImage(`data:image/png;base64,${imgStr}`);
                    break;
                case "base64":
                    img = await Canvas.loadImage(imgStr);
            }

        }
        const heightMultiplier = content.text && img ? 0.5 : 1.0;   // If both text & image, split display 50/50
        const padding = 3;

        if (img) {  // Draw image if present
            img.width = w * heightMultiplier - 2 * padding;
            img.height = w * heightMultiplier - 2 * padding;

            ctx.drawImage(img, w / 2 - img.width / 2 + padding, heightMultiplier * w / 2 - img.height / 2 + padding);
        }

        if (content.text) { // Draw text if present
            // Split into lines, then wrap each line into 15 chars max
            // Mark new lines with \n at start, wrapped lines do not (for limiting font size later)
            let lines = content.text.split("\n");
            lines = lines.flatMap(l => ("\n" + l).match(/\n?.{1,15}/g) || []);  // Break lines at 15 chars

            const top = (1 - heightMultiplier) * canvas.height;
            const lineHeight = Math.floor((heightMultiplier * canvas.height - 2 * padding) / lines.length);

            // Render each line
            lines.forEach((l, i) => {
                // Reduce font size for wrapped lines - avoids trailing line being large font
                const config: Partial<DrawOptions> = { minSize: 5, maxSize: l.startsWith("\n") ? 25 : 10, vAlign: 'center', hAlign: 'center', fitMethod: 'box', textFillStyle: content.colour || "white" };
                drawText(ctx as any, l.trim(), titleFont,
                    {
                        x: padding,
                        y: top + i * lineHeight + padding,
                        width: canvas.width - 2 * padding,
                        height: lineHeight,
                    }, config);
            })
        }

        // Dispatch canvas to Loupedeck
        await this.drawCanvas(index, canvas);
    }

    async drawCanvas(index: number, canvas: Canvas.Canvas) {
        // Dispatch canvas to Loupedeck

        // const buffer = canvas.toBuffer('image/png')
        // fs.writeFileSync(`key${index}.png`, buffer)

        if (!this.loupedeck) return;
        let buffer = canvas.toBuffer("raw");

        const output = Buffer.alloc((buffer.length * 3 / 4));
        for (let i=0, j=0; i < buffer.length; i += 4, j += 3) {
            // Remove alpha channel and reverse endian
            // TODO: consider system endianness
            output[j+0] = buffer[i+2];
            output[j+1] = buffer[i+1];
            output[j+2] = buffer[i+0];
        }

        // const RGBBuffer = buffer.filter((_, i) => i % 4 != rem); // Remove alpha channel (sorry! jank)
        await this.loupedeck.drawKeyBuffer(index, output, LoupedeckBufferFormat.RGB)
            .catch(e => this.log.error("Error drawing Loupedeck key", e));
    }
}

/*


    getNodeCG().addListener("serverStopping", () => {
        if (ld) {
            console.log("Disconnecting from LD");
            ld.blankDevice(true, true).catch(() => { });
            ld.close().catch(() => { });

            (ld as any).connection.close().catch(() => { });
        }
    });
}

*/
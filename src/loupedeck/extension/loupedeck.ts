import Canvas from 'canvas';
import drawText, { DrawOptions } from 'node-canvas-text';
import opentype from 'opentype.js';
import { endianness } from 'os';
import { BackpackFill } from 'react-bootstrap-icons';

import {
    listLoupedecks, LoupedeckBufferFormat, LoupedeckControlInfo, LoupedeckControlType,
    LoupedeckDevice, LoupedeckDisplayId, LoupedeckTouchEventData, openLoupedeck
} from '@loupedeck/node';
import NodeCG from '@nodecg/types';

import { CommPoint, Messages, Replicants } from '../../common/commpoint/commpoint';
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

    constructor() {
        super("loupedeck", {
            login: Replicant<LoupeLogin>("loupeLogin", "loupedeck"),
            status: Replicant<LoupeStatus>("loupeStatus", "loupedeck"),
            display: Replicant<LoupeDisplay>("loupeDisplay", "loupedeck")
        }, listeners);
    }

    async _connect() {
        if (this.loupedeck) await this.loupedeck.close().catch((e) => this.log.warn("Error closing", e));
        this.loupedeck = null;

        let tryCount = 6;
        while (tryCount > 0) {
            let path;
            if (this.replicants.login.value.path) {
                path = this.replicants.login.value.path;
            } else {
                const loupedecks = await listLoupedecks();
                if (loupedecks && loupedecks.length > 0) {
                    path = loupedecks[0].path;
                } else {
                    this.log.error("No Loupedecks found");
                }
            }

            if (path) {
                const ld = await openLoupedeck(path)
                    .catch((err) => console.error("Failed connecting to Loupedeck", err));
                if (ld) {
                    this.loupedeck = ld;
                    return;
                }
            }
            tryCount--;
            await new Promise(r => setTimeout(r, 5000));  // Wait longer if not in startup
        }
        throw new Error("Initial Connection attempts failed");
    }

    async _disconnect() {
        if (this.loupedeck) {
            await this.loupedeck.close();
        }
    }

    async isConnected() {
        // If cannot fetch serial number, must be disconnected
        let connected = true;
        await this.loupedeck?.getSerialNumber().catch(() => connected = false);
        return connected;
    }

    async _setupListeners() {
        await this._interactionListeners();

        const svg = await fetch("https://icons.getbootstrap.com/assets/icons/backpack-fill.svg").then(r => r.text());
        Promise.all([
            this.drawKey(0, { text: "Test" }),
            this.drawKey(1, { text: "Quite Long Text Test" }),
            this.drawKey(2, { imgType: "svgURL", img: "https://icons.getbootstrap.com/assets/icons/backpack-fill.svg", bg: "red", colour: "blue" }),
            this.drawKey(3, { imgType: "svg", img: svg }),
            this.drawKey(4, { text: "SVG & Text", imgType: "svgURL", img: "https://icons.getbootstrap.com/assets/icons/backpack-fill.svg" }),
            this.drawKey(5, { text: "Quite Long\nNew Line" }),
            this.drawKey(6, { text: "Very Very Long Long Single Single Line Line Test Test Test Test" }),
        ]).catch(e => this.log.error("Error drawing keys", e))

        // const svg = await fetch("https://icons.getbootstrap.com/assets/icons/backpack-fill.svg").then(r => r.text());
        // drawKey(myLoupedeck, 13, "Test Text", svg).catch(e => log.error("Error drawing key", e));
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



    async drawKey(index: number, content: CellData) {
        if (!this.loupedeck || !titleFont) return false;
        const w = this.loupedeck.lcdKeySize;
        let canvas = Canvas.createCanvas(w, w);
        let ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = content.bg || "#222222";
        ctx.fillRect(0, 0, w, w);

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
                    const b64 = Buffer.from(coloured).toString("base64");
                    img = await Canvas.loadImage(`data:image/svg+xml;base64,${b64}`);
                    break;

                case "pngURL":
                case "png":
                    break;
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
        let buffer = canvas.toBuffer("raw");
        const rem = endianness() == "LE" ? 3 : 0;
        const RGBBuffer = buffer.filter((_, i) => i % 4 != rem); // Remove alpha channel (sorry! jank)
        await this.loupedeck.drawKeyBuffer(index, RGBBuffer as any, LoupedeckBufferFormat.RGB)
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
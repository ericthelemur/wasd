import Canvas from 'canvas';
import drawText, { DrawOptions } from 'node-canvas-text';
import opentype from 'opentype.js';
import { endianness } from 'os';
import { BackpackFill } from 'react-bootstrap-icons';

import {
    listLoupedecks, LoupedeckBufferFormat, LoupedeckControlInfo, LoupedeckControlType,
    LoupedeckDevice, LoupedeckDisplayId, LoupedeckTouchEventData, openLoupedeck
} from '@loupedeck/node';

import { getNodeCG } from '../../common/utils';
import { sendTo } from '../messages';

const log = new (getNodeCG().Logger)("Loupedeck");

async function connect() {
    let myLoupedeck: LoupedeckDevice | null = null;
    let tryCount = 6;
    while (!myLoupedeck) {
        const loupedecks = await listLoupedecks();
        console.log(loupedecks);
        if (loupedecks && loupedecks.length > 0) {
            const ld = await openLoupedeck(loupedecks[0].path)
                .catch((err) => console.error("Failed connecting to Loupedeck", err));
            if (ld) myLoupedeck = ld;
        }
        tryCount--;
        await new Promise(r => setTimeout(r, tryCount > 0 ? 5000 : 15000));  // Wait longer if not in startup
    }
    return myLoupedeck;
}

const titleFont = opentype.loadSync('D:/Documents/Coding/wasd-nodecg-25-final/bundles/wasd/src/common/fonts/Montserrat-Bold.ttf');

interface CellContent {
    colour?: string;
    bg?: string;
    text?: string;
    imgType?: "svg" | "png" | "svgURL" | "pngURL";
    img?: string;
}

async function drawKey(loupedeck: LoupedeckDevice, index: number, content: CellContent) {
    const w = loupedeck.lcdKeySize;
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
                imgStr = await fetch(content.img).then(r => r.text()).catch(e => log.error(`Error fetching SVG for LD index ${index} from URL ${content.img}`)) || "";
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
    await loupedeck.drawKeyBuffer(index, RGBBuffer as any, LoupedeckBufferFormat.RGB)
        .catch(e => log.error("Error drawing Loupedeck key", e));
}

const nodecg = getNodeCG();
function demo() {
    let ld: LoupedeckDevice | null;
    connect().then(async (myLoupedeck) => {
        console.log("Connected to Loupedeck")
        ld = myLoupedeck;
        myLoupedeck.blankDevice(true, true).catch(e => log.error("Error blanking device", e));

        myLoupedeck.on('down', (info: LoupedeckControlInfo) => {
            log.info('control down', info)
            if (info.type == LoupedeckControlType.Button) {
                sendTo("loupedeck.buttonDown", { button: info.index });
            } else {
                sendTo("loupedeck.knobDown", { knob: info.index })
            }
        })

        myLoupedeck.on('up', (info) => {
            log.info('control up', info);
            if (info.type == LoupedeckControlType.Button) {
                sendTo("loupedeck.buttonUp", { button: info.index });
            } else {
                sendTo("loupedeck.knobUp", { knob: info.index })
            }
        })

        myLoupedeck.on('rotate', (info, delta) => {
            log.info('control rotate', info, delta)
            if (info.type != LoupedeckControlType.Rotary) return;
            sendTo("loupedeck.knobRotate", { knob: info.index, amount: delta });
        })

        function screenTouch(info: LoupedeckTouchEventData, isStart: boolean) {
            log.info("touch", isStart ? "start" : "end", JSON.stringify(info.changedTouches))
            info.changedTouches.forEach((press) => {
                if (press.x < 0 || press.y < 0) return;
                if (ld && (press.x > ld.displayMain.width || press.y > ld.displayMain.height)) return;
                if (press.target.key === undefined) return;

                sendTo(isStart ? "loupedeck.screenDown" : "loupedeck.screenUp", { key: press.target.key });
            })
        }
        myLoupedeck.on("touchstart", info => screenTouch(info, true));
        myLoupedeck.on("touchend", info => screenTouch(info, false));

        myLoupedeck.on('error', (error) => {
            log.error(error)
        })

        const svg = await fetch("https://icons.getbootstrap.com/assets/icons/backpack-fill.svg").then(r => r.text());
        Promise.all([
            drawKey(myLoupedeck, 0, { text: "Test" }),
            drawKey(myLoupedeck, 1, { text: "Quite Long Text Test" }),
            drawKey(myLoupedeck, 2, { imgType: "svgURL", img: "https://icons.getbootstrap.com/assets/icons/backpack-fill.svg", bg: "red", colour: "blue" }),
            drawKey(myLoupedeck, 3, { imgType: "svg", img: svg }),
            drawKey(myLoupedeck, 4, { text: "SVG & Text", imgType: "svgURL", img: "https://icons.getbootstrap.com/assets/icons/backpack-fill.svg" }),
            drawKey(myLoupedeck, 5, { text: "Quite Long\nNew Line" }),
            drawKey(myLoupedeck, 6, { text: "Very Very Long Long Single Single Line Line Test Test Test Test" }),
        ]).catch(e => log.error("Error drawing keys", e))

        // const svg = await fetch("https://icons.getbootstrap.com/assets/icons/backpack-fill.svg").then(r => r.text());
        // drawKey(myLoupedeck, 13, "Test Text", svg).catch(e => log.error("Error drawing key", e));
    });

    getNodeCG().addListener("serverStopping", () => {
        if (ld) {
            console.log("Disconnecting from LD");
            ld.blankDevice(true, true).catch(() => { });
            ld.close().catch(() => { });

            (ld as any).connection.close().catch(() => { });
        }
    });
}

demo();
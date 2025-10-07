import Canvas from 'canvas';
import drawText, { DrawOptions } from 'node-canvas-text';
import opentype from 'opentype.js';
import { endianness } from 'os';
import { BackpackFill } from 'react-bootstrap-icons';

import {
    listLoupedecks, LoupedeckBufferFormat, LoupedeckDevice, LoupedeckDisplayId, openLoupedeck
} from '@loupedeck/node';

import { getNodeCG } from '../../common/utils';

const log = new (getNodeCG().Logger)("Loupedeck");

async function connect() {
    let myLoupedeck: LoupedeckDevice | null = null;
    let tryCount = 6;
    while (!myLoupedeck) {
        const loupedecks = await listLoupedecks()
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
    ctx.fillStyle = content.bg || "darkgrey";
    ctx.fillRect(0, 0, w, w);

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
    const heightMultiplier = content.text && img ? 0.5 : 1.0;   // If both, split display
    const padding = 3;

    if (img) {  // Draw image if present
        console.log(img?.width, img?.height);
        img.width = w * heightMultiplier - 2 * padding;
        img.height = w * heightMultiplier - 2 * padding;

        ctx.drawImage(img, w / 2 - img.width / 2 + padding, heightMultiplier * w / 2 - img.height / 2 + padding);
    }

    if (content.text) { // Draw text if present
        let lines = content.text.split("\n");
        lines = lines.flatMap(l => l.match(/.{1,15}/g) || []);  // Break lines at 15 chars
        // wrap?

        const top = (1 - heightMultiplier) * canvas.height;
        const lineHeight = Math.floor((heightMultiplier * canvas.height - 2 * padding) / lines.length);
        const config: Partial<DrawOptions> = { minSize: 5, maxSize: 200, vAlign: 'center', hAlign: 'center', fitMethod: 'box', textFillStyle: content.colour || "white" };

        lines.forEach((l, i) => {
            drawText(ctx as any, l, titleFont,
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

function demo() {
    let ld: LoupedeckDevice | null;
    connect().then(async (myLoupedeck) => {
        ld = myLoupedeck;
        myLoupedeck.blankDevice(true, true);
        myLoupedeck.on('down', (info) => {
            log.info('control down', info)
        })

        myLoupedeck.on('up', (info) => {
            log.info('control up', info)
        })

        myLoupedeck.on('rotate', (info, delta) => {
            log.info('control rotate', info, delta)
        })

        myLoupedeck.on("touchend", (info) => {
            log.info("touch end", JSON.stringify(info.changedTouches))
        })

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

    function handler() {
        if (ld) {
            log.info("Disconnecting from Loupedeck")
            ld.close();
        }
    }

    [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
        process.on(eventType, handler);
    });
}

demo();
import { sendError, sendSuccess } from '../../common/utils';
import { listenTo, sendTo } from '../messages';
import { Action, doInteraction } from './actions';
import { loupedeck } from './index.extension';
import { getCellStateData } from './utils';
import { Screen } from '../../types/schemas/loupedeck';

listenTo("setPage", (page, ack) => {
    if (page in loupedeck.replicants.display.value.pages) {
        loupedeck.replicants.display.value.current = page;
        sendSuccess(ack, page);
    } else {
        sendError(ack, `Page ${page} does not exist. Options: ${Object.keys(loupedeck.replicants.display.value.pages).join(", ")}`);
    }
})

loupedeck.replicants.display.on("change", (disp) => {
    const currPages = disp.pages["page"]?.pages as string[];
    const newPages = Object.keys(disp.pages);
    if (!currPages || !newPages || newPages.some(p => !currPages.includes(p)) || currPages.some(p => !newPages.includes(p))) {
        const cells: Screen = Array(15).fill(null) as Screen;
        Object.entries(disp.pages).forEach(([key, page], i) => cells[i] = {
            "states": {
                "default": {
                    "graphic": {
                        "text": page.display || key
                    },
                    "interaction": {
                        "category": "nodecg",
                        "action": "message",
                        "bundle": "loupedeck",
                        "message": "setPage",
                        "data": key
                    }
                }
            }
        });

        disp.pages["page"] = {
            "pages": newPages,
            "screen": cells
        };
    }
});



// Connected colour rotation
let count = 0;
const colours: [number, number, number][] = [[128, 0, 0], [128, 128, 0], [0, 128, 0], [0, 128, 128], [0, 0, 128], [128, 0, 128]];
const steps = 4;    // Steps in between each colour
const lerp = (v1: number, v2: number, w: number) => (1 - w) * v1 + w * v2;
setInterval(async () => {
    const connected = await loupedeck.isConnected();
    if (!connected) return;
    count = (count + 1 / steps) % (colours.length);
    const c1 = colours[Math.floor(count)], c2 = colours[Math.ceil(count) % (colours.length)];
    const promise = sendTo("setButtonColour", { button: 0, colour: [lerp(c1[0], c2[0], count % 1), lerp(c1[1], c2[1], count % 1), lerp(c1[2], c2[2], count % 1)] });
    if (promise) promise.then(r => { console.log(r); if (r == "Not connected!") loupedeck.reconnect() })
}, 1000);


// Send knob adjustments to mixer channels

// listenTo("knobRotate", ({ knob, amount }) => {
//     // Sets a channel's volume with rotation
//     const disp = loupedeck.replicants.display.value;
//     const page = disp.pages[disp.current];
//     if (!page) return;
//     const knobs = page.interactions?.knobs;
//     const channelName = knobs.channels[knob];
//     if (!channelName) return;
//     let cmd = channelName;
//     if (!cmd.startsWith("/")) {     // Config value can either be name of a channel or a OSC command. If channel name, lookup here
//         const channelIndex = channels.value.mics[channelName];
//         if (!channelIndex) return;
//         cmd = `/ch/${String(channelIndex).padStart(2, "0")}/mix/fader`;
//     }
//     getX32().incrementFader(cmd, knobs.rotateScale * amount);
// });

function screenAction(key: number, action: Action) {
    const cellData = loupedeck.getCurrentPage().screen[key];
    const cellState = getCellStateData(key);
    if (!cellData || !cellState) return;
    doInteraction(cellState?.interaction, action, { id: "key-" + key, cell: cellData, state: cellState });
}

listenTo("screenDown", ({ key }) => screenAction(key, "down"));
listenTo("screenUp", ({ key }) => screenAction(key, "up"));
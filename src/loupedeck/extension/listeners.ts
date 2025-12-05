import { getNodeCG } from '../../common/utils';
import { channels } from '../../mixer/extension/mixer/replicants';
import { getX32 } from '../../mixer/extension/mixer/utils';
import { NodecgMsg } from '../../types/schemas/loupedeck';
import { listenTo, sendTo } from '../messages';
import { loupedeck } from './index.extension';

const nodecg = getNodeCG();

listenTo("connect", () => {

})

// Connected colour rotation
let count = 0;
const colours: [number, number, number][] = [[128, 0, 0], [128, 128, 0], [0, 128, 0], [0, 128, 128], [0, 0, 128], [128, 0, 128]];
const steps = 4;    // Steps in between each colour
const lerp = (v1: number, v2: number, w: number) => (1 - w) * v1 + w * v2;
setInterval(() => {
    if (!loupedeck.isConnected()) return;
    count = (count + 1 / steps) % (colours.length);
    const c1 = colours[Math.floor(count)], c2 = colours[Math.ceil(count) % (colours.length)];
    sendTo("setButtonColour", { button: 0, colour: [lerp(c1[0], c2[0], count % 1), lerp(c1[1], c2[1], count % 1), lerp(c1[2], c2[2], count % 1)] });
}, 1000);


// Send knob adjustments to mixer channels

listenTo("knobRotate", ({ knob, amount }) => {
    // Sets a channel's volume with rotation
    const disp = loupedeck.replicants.display.value;
    const page = disp.pages[disp.current];
    if (!page) return;
    const knobs = page.interactions?.knobs;
    const channelName = knobs.channels[knob];
    if (!channelName) return;
    let cmd = channelName;
    if (!cmd.startsWith("/")) {     // Config value can either be name of a channel or a OSC command. If channel name, lookup here
        const channelIndex = channels.value.mics[channelName];
        if (!channelIndex) return;
        cmd = `/ch/${String(channelIndex).padStart(2, "0")}/mix/fader`;
    }
    getX32().incrementFader(cmd, knobs.rotateScale * amount);
});

type Interaction = null | NodecgMsg;
function doInteraction(interaction?: Interaction) {
    if (!interaction) return;
    if (interaction.category == "nodecg") {
        if (interaction.action == "message") {
            if (interaction.bundle) {
                if (interaction.data) nodecg.sendMessageToBundle(interaction.message, interaction.bundle, interaction.data);
                else nodecg.sendMessageToBundle(interaction.message, interaction.bundle);
            } else {
                if (interaction.data) nodecg.sendMessage(interaction.message, interaction.data);
                else nodecg.sendMessage(interaction.message);
            }
        }
    }
}

// const downTimes = [-1, -1, -1, -1, -1,  -1, -1, -1, -1, -1,  -1, -1, -1, -1, -1];
// listenTo("buttonDown", ({ button }) => {
//     const disp = loupedeck.replicants.display.value;
//     const page = disp.pages[disp.current];
//     if (!page) return;
//     const btn = page.screen[button]?.button;
//     if (!btn) return;
//     if (btn.btnType == "tap") {
//         doInteraction(btn.on);
//     } else if (btn.btnType == "toggle-or-tap") {
//         downTimes[button] = Date.now();
//         doInteraction(btn.on);
//     }
// });

// listenTo("buttonUp", ({ button }) => {
//     const disp = loupedeck.replicants.display.value;
//     const page = disp.pages[disp.current];
//     if (!page) return;
//     const btn = page.screen[button]?.button;
//     if (!btn) return;
//     if (btn.btnType == "tap") {
//         doInteraction(btn.off);
//     } else if (btn.btnType == "toggle-or-tap") {
//         if (Date.now() - downTimes[button] < 500) {
//             doInteraction(btn.off);
//         }
//     }
// });
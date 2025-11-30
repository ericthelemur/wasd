import { getNodeCG } from '../../common/utils';
import { channels } from '../../mixer/extension/mixer/replicants';
import { getX32 } from '../../mixer/extension/mixer/utils';
import { listenTo, sendTo } from '../messages';
import { loupedeck } from './index.extension';

const nodecg = getNodeCG();

listenTo("connect", () => {

})

// Connected colour rotation

const steps = 4;
const colours: [number, number, number][] = [
    [128, 0, 0],
    [128, 128, 0],
    [0, 128, 0],
    [0, 128, 128],
    [0, 0, 128],
    [128, 0, 128]
];

function lerp(v1: number, v2: number, w: number) {
    return (1 - w) * v1 + w * v2;
}

let count = 0;
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
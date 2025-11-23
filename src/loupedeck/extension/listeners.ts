import { getNodeCG } from '../../common/utils';
import { channels } from '../../mixer/extension/mixer/replicants';
import { getX32 } from '../../mixer/extension/mixer/utils';
import { listenTo } from '../messages';
import { loupedeck } from './index.extension';

const nodecg = getNodeCG();

listenTo("connect", () => {

})

listenTo("knobRotate", ({ knob, amount }) => {
    // Sets a channel's volume with rotation
    const interactions = loupedeck.replicants.interactions.value;
    nodecg.log.info(`${interactions} ${interactions.knobs.channels} ${interactions.knobs.channels[knob]}`)
    const channelName = interactions.knobs.channels[knob];
    if (!channelName) return;
    let cmd = channelName;
    if (!cmd.startsWith("/")) {     // Config value can either be name of a channel or a OSC command. If channel name, lookup here
        const channelIndex = channels.value.mics[channelName];
        if (!channelIndex) return;
        cmd = `/ch/${String(channelIndex).padStart(2, "0")}/mix/fader`;
    }
    getX32().incrementFader(cmd, interactions.knobs.rotateScale * amount);
});
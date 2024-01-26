import { Channels, Muted } from 'types/schemas';

import { listenTo } from '../common/listeners';
import { getNodeCG, getX32, Replicant, storeNodeCG } from './utils';

const x32 = getX32();

const channels = Replicant<Channels>("channels");
var mutesMap: { [address: string]: string } = {}

function genReverseMap(chls?: Channels) {
    const v = chls ?? channels.value;
    mutesMap = v ? Object.fromEntries(Object.entries(v.mics).map(([k, v]) => [v, k])) : {};
}
channels.on("change", genReverseMap);
genReverseMap();


const muted = Replicant<Muted>("muted");

const muteRegex = new RegExp(/^\/ch\/(\d+)\/mix\/on$/);
x32.on("message", ({ address, args }) => {
    const typedArgs = args as [{ type: "i", value: number }];
    const m = muteRegex.exec(address);
    if (m) { // Is mute toggle
        const key = mutesMap[Number(m[1])];
        if (key) muted.value[key] = !Boolean(typedArgs[0].value);
    }
});

x32.on("ready", () => {
    Object.entries(channels.value.mics).forEach(([k, ch]) => {
        x32.sendMethod({ address: `/ch/0${ch}/mix/on`, args: [] }).then((r) => {
            const args = r.args as [{ type: "i", value: number }];
            muted.value[k] = Boolean(args[0].value);
        });
    })
})

listenTo("setMute", ({ mic, muted }) => {
    // mic like /ch/15/mix/on
    // response like { address: '/ch/15/mix/on', args: [ { type: 'i', value: 1 } ] }
    if (!channels.value || !channels.value.mics) return;
    const chIndex = channels.value.mics[mic];
    const address = `/ch/0${chIndex}/mix/on`
    // x32.sendMethod({ address: address, args: [] }).then((r) => {
    //     const res = r as { address: string, args: { value: any; }[] };
    //     const currentlyMuted = res.args[0].value;
    return x32.sendMethod({ address: address, args: [{ type: 'i', value: Number(!muted) }] })
    // })
})

const nodecg = getNodeCG();
nodecg.listenFor("transitioning", "nodecg-obs-control", (data: { transitionName: string; fromScene?: string; toScene?: string; }) => {
    if (!data.toScene) return;
    const newActiveDCAs = channels.value.scenes[data.toScene]
    if (!newActiveDCAs) return;
    for (const [name, number] of Object.entries(channels.value.dcas)) {
        const enabledDCA = newActiveDCAs.includes(name);
        const address = `/dca/${number}/fader`;
        // x32.setFader(address, enabledDCA ? 0.75 : 0);
        x32.sendMethod({ address: address, args: [{ type: 'f', value: enabledDCA ? 0.75 : 0 }] });
    }
})
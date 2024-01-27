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
        const adStr = String(ch).padStart(2, "0");
        x32.sendMethod({ address: `/ch/${adStr}/mix/on`, args: [] }).then((r) => {
            const args = r.args as [{ type: "i", value: number }];
            muted.value[k] = Boolean(args[0].value);
        });
    })
})

listenTo("setMute", ({ mic, muted }) => {
    if (!x32.connected()) return;
    // mic like /ch/15/mix/on
    // response like { address: '/ch/15/mix/on', args: [ { type: 'i', value: 1 } ] }
    if (!channels.value || !channels.value.mics) return;
    const chIndex = channels.value.mics[mic];
    const chStr = String(chIndex).padStart(2, "0");
    const address = `/ch/${chStr}/mix/on`
    // x32.sendMethod({ address: address, args: [] }).then((r) => {
    //     const res = r as { address: string, args: { value: any; }[] };
    //     const currentlyMuted = res.args[0].value;
    return x32.sendMethod({ address: address, args: [{ type: 'i', value: Number(!muted) }] })
    // })
})

const nodecg = getNodeCG();
nodecg.listenFor("transitioning", "nodecg-obs-control", (data: { transitionName: string; fromScene?: string; toScene?: string; }) => {
    if (!x32.connected()) return;
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

listenTo("setTechMuted", ({ bus, muted }) => {
    if (!x32.connected()) return;
    if (!channels.value || !channels.value.buses) return;
    nodecg.log.info(muted ? "Muting" : "Unmuting", "tech for", bus);
    const busIndex = channels.value.buses[bus];
    if (busIndex === undefined) return;
    const busStr = String(busIndex).padStart(2, "0");

    const techCh = String(channels.value.tech).padStart(2, "0");

    nodecg.log.info("Buses", techCh, busStr);
    var address: string;
    if (busIndex === 0) address = `/ch/${techCh}/mix/fader`;
    else address = `/ch/${techCh}/mix/${busStr}/level`;
    nodecg.log.info("Tech", address);
    return x32.sendMethod({ address, args: [{ type: 'f', value: muted ? 0 : 0.75 }] })
})
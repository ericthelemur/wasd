import { Channels, Login, Muted, TechMuted } from 'types/schemas';

import { getNodeCG, Replicant, storeNodeCG } from '../../../common/utils';
import { listenTo } from '../../common/listeners';
import { channels, login, muted, techMuted } from './replicants';
import { getX32 } from './utils';

const x32 = getX32();

var mutesMap: { [address: string]: string } = {}

function genReverseMap(chls?: Channels) {
    const v = chls ?? channels.value;
    mutesMap = v ? Object.fromEntries(Object.entries(v.mics).map(([k, v]) => [v, k])) : {};
}
channels.on("change", genReverseMap);
genReverseMap();


const nodecg = getNodeCG();
// Update DCAs with OBS scene
// nodecg.listenFor("transitioning", "nodecg-obs-control", (data: { transitionName: string; fromScene?: string; toScene?: string; }) => {

function setDCAs(toScene?: string) {
    if (!x32.connected()) return;
    if (!toScene) return;
    const newActiveDCAs = channels.value.scenes[toScene];
    nodecg.log.info("Settings DCAs to", newActiveDCAs);
    if (!newActiveDCAs) return;

    for (const [name, number] of Object.entries(channels.value.dcas)) {
        const enabledDCA = newActiveDCAs.includes(name);
        const address = `/dca/${number}/fader`;
        // x32.setFader(address, enabledDCA ? 0.75 : 0);
        // x32.sendMethod({ address: address, args: [{ type: 'f', value: enabledDCA ? 0.75 : 0 }] });
        x32.fade(address, null, enabledDCA ? 0.75 : 0, enabledDCA ? 1000 : 500);
    }

    // for (const [name, number] of Object.entries(channels.value.mutegroups)) {
    //     const enabledDCA = newActiveDCAs.includes(name);
    //     const address = `/config/mute/${number}`;
    //     x32.sendMethod({ address: address, args: [{ type: 'i', value: enabledDCA ? 0 : 1 }] });
    // }
}

nodecg.listenFor("transitioning", (data: { transitionName: string; fromScene?: string; toScene?: string; }) => {
    if (!x32.connected() || login.value.suppress) return;
    if (!data.toScene) return;
    setDCAs(data.toScene);
});


nodecg.listenFor("setDCAs", (data: { toScene?: string; }) => {
    if (!x32.connected() || login.value.suppress) return;
    if (!data.toScene) return;
    setDCAs(data.toScene);
});

// Mute initialization
x32.on("ready", () => {
    Object.entries(channels.value.mics).forEach(([k, ch]) => {
        const adStr = String(ch).padStart(2, "0");
        // Poll muted for each on startup
        x32.sendMethod({ address: `/ch/${adStr}/mix/on`, args: [] }).then((r) => {
            const args = r.args as [{ type: "i", value: number }];
            muted.value[k].muted = !Boolean(args[0].value);
        });

        x32.sendMethod({ address: `/-stat/solosw/${adStr}`, args: [] }).then((r) => {
            const args = r.args as [{ type: "i", value: number }];
            muted.value[k].soloed = Boolean(args[0].value);
        });
    })
})

// Mute toggle send
listenTo("setMute", ({ mic, muted }) => {
    if (!x32.connected()) return;
    if (!channels.value || !channels.value.mics) return;
    const chIndex = channels.value.mics[mic];
    const chStr = String(chIndex).padStart(2, "0");
    const address = `/ch/${chStr}/mix/on`;
    return x32.sendMethod({ address: address, args: [{ type: 'i', value: Number(!muted) }] });
})

// Mute toggle send
listenTo("setTalkback", ({ mic, talkback, muted }) => {
    if (!x32.connected()) return;
    if (!channels.value || !channels.value.mics) return;
    const chIndex = channels.value.mics[mic];
    const chStr = String(chIndex).padStart(2, "0");

    const address = `/-stat/solosw/${chStr}`;
    const muteAddress = `/ch/${chStr}/mix/on`;
    return Promise.all([
        x32.sendMethod({ address: address, args: [{ type: 'i', value: Number(talkback) }] }),
        x32.sendMethod({ address: muteAddress, args: [{ type: 'i', value: Number(muted === undefined ? !talkback : !muted) }] })
    ])
})

// Mute toggle response
const muteRegex = new RegExp(/^\/ch\/(\d+)\/mix\/on$/);
const soloRegex = new RegExp(/^\/-stat\/solosw\/(\d+)$/);
x32.on("message", ({ address, args }) => {
    const typedArgs = args as [{ type: "i", value: number }];
    const m = muteRegex.exec(address);
    if (m) { // Is mute toggle
        const key = mutesMap[Number(m[1])];
        if (key) muted.value[key].muted = !Boolean(typedArgs[0].value);
    }
    const s = soloRegex.exec(address);
    if (s) { // Is mute toggle
        const key = mutesMap[Number(s[1])];
        if (key) muted.value[key].soloed = Boolean(typedArgs[0].value);
    }
});


// Tech toggle initialization
x32.on("ready", () => {
    console.log("Loading tech toggles", channels.value.buses);
    if (!channels.value.buses) return;
    const techCh = String(channels.value.tech).padStart(2, "0");
    Object.entries(channels.value.buses).forEach(([k, b]) => {
        // Poll fader for each on startup
        const busStr = String(b).padStart(2, "0");
        const address = b === 0 ? `/ch/${techCh}/mix/fader` : `/ch/${techCh}/mix/${busStr}/level`
        x32.sendMethod({ address, args: [] });
    })
})

// Tech toggle send
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

// Tech toggle response
x32.on("message", ({ address, args }) => {
    const techStr = `/ch/${String(channels.value.tech).padStart(2, "0")}/mix/`;
    if (address.startsWith(techStr)) {
        const suffix = address.slice(techStr.length);
        var channelNo: number | null = null;
        if (suffix === "fader") channelNo = 0;
        else if (suffix.endsWith("/level")) {
            channelNo = parseInt(suffix.split("/")[0]);
        }
        nodecg.log.warn("suffix", suffix, "chNo", channelNo, "buses", channels.value.buses);
        if (channelNo !== null && channels.value.buses) {
            const channel = Object.entries(channels.value.buses).find(([b, n]) => n === channelNo);
            if (channel) {
                const typedArgs = args as [{ type: "f", value: number },];
                techMuted.value[channel[0]] = !Boolean(typedArgs[0].value);
            }
        }
    }
});

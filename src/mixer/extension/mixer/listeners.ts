
import { Channels, Login, Muted, TechMuted } from 'types/schemas';

import { getNodeCG, Replicant, sendError, sendSuccess, storeNodeCG } from '../../../common/utils';
import { listenTo } from '../../messages';
import { getX32 } from './utils';
import { F, I } from 'osc';

const x32 = getX32();

var mutesMap: { [address: string]: string } = {}

function genReverseMap(chls?: Channels) {
    const v = chls ?? x32.replicants.channels.value;
    mutesMap = v ? Object.fromEntries(Object.entries(v.mics).map(([k, v]) => [v, k])) : {};
}
x32.replicants.channels.on("change", genReverseMap);
genReverseMap();

const nodecg = getNodeCG();

async function setDCAs(toScene?: string) {
    if (!(await x32.isConnected())) return;
    if (!toScene) return;
    const channels = x32.replicants.channels;
    const newActiveDCAs = channels.value.scenes[toScene];
    nodecg.log.info("Settings DCAs to", newActiveDCAs);
    if (!newActiveDCAs) return;

    for (const [name, number] of Object.entries(channels.value.dcas)) {
        const enabledDCA = newActiveDCAs.includes(name);
        const address = `/dca/${number}/fader`;

        let vol = enabledDCA ? 0.75 : 0;
        if (enabledDCA && name == "MUSIC" && toScene != "BREAK") {  // Mix music lower on non-break
            vol = (channels.value as any)["music-vol"] || 0.5;      // Pull override volume from unofficial channels.music-vol
        }
        x32.fade(address, null, vol, enabledDCA ? 1000 : 500);  // Fade for 1s or 0.5s
    }

    setTimeout(() => {  // Set configured mute groups after 0.5s (cannot fade these)
        for (const [name, number] of Object.entries(channels.value.mutegroups)) {
            const enabledDCA = newActiveDCAs.includes(name);
            const address = `/config/mute/${number}`;
            x32.sendToMixer({ address: address, args: [{ type: 'i', value: enabledDCA ? 0 : 1 }] }, false).catch(e => x32.log.error(e));
        }
    }, 500);
}

// Listen to OBS bundle's scene transition. Update DCAs with the scene
nodecg.listenFor("transitioning", async (data: { transitionName: string; fromScene?: string; toScene?: string; }) => {
    if (!(await x32.isConnected())) return;
    if (!data.toScene) return;
    setDCAs(data.toScene);
});


nodecg.listenFor("setDCAs", async (data: { toScene?: string; }) => {
    if (!(await x32.isConnected())) return;
    if (!data.toScene) return;
    setDCAs(data.toScene);
});


// Mute initialization
listenTo("connected", () => {
    // TODO Use batch messages?? Are they supported??
    Object.entries(x32.replicants.channels.value.mics).forEach(([k, ch]) => {
        const adStr = String(ch).padStart(2, "0");
        // Poll for muted & solo for each
        x32.sendToMixer({ address: `/ch/${adStr}/mix/on`, args: [] }, false).then((r) => {
            const args = r.args as [{ type: "i", value: number }];
            x32.replicants.muted.value[k].muted = !Boolean(args[0].value);
        }).catch(e => x32.log.error(e));

        x32.sendToMixer({ address: `/-stat/solosw/${adStr}`, args: [] }, false).then((r) => {
            const args = r.args as [{ type: "i", value: number }];
            x32.replicants.muted.value[k].soloed = Boolean(args[0].value);
        }).catch(e => x32.log.error(e));
    })
})

// Mute toggle send
listenTo("setMute", async ({ mic, muted }, ack) => {
    if (!(await x32.isConnected())) return;
    const channels = x32.replicants.channels;
    if (!channels.value || !channels.value.mics) return;
    const chIndex = channels.value.mics[mic];
    const chStr = String(chIndex).padStart(2, "0");
    const address = `/ch/${chStr}/mix/on`;
    const response = await x32.sendToMixer<[I]>({ address: address, args: [{ type: 'i', value: Number(!muted) }] }).catch(e => { x32.log.error(e); sendError(ack, e) });
    if (response) sendSuccess(ack, response.args[0].value != 0);
})

// Mute toggle send
listenTo("setTalkback", async ({ mic, talkback, muted }) => {
    if (!(await x32.isConnected())) return;
    const channels = x32.replicants.channels;
    if (!channels.value || !channels.value.mics) return;
    const chIndex = channels.value.mics[mic];
    const chStr = String(chIndex).padStart(2, "0");

    const address = `/-stat/solosw/${chStr}`;
    const muteAddress = `/ch/${chStr}/mix/on`;
    return Promise.all([
        x32.sendToMixer({ address: address, args: [{ type: 'i', value: Number(talkback) }] }),
        x32.sendToMixer({ address: muteAddress, args: [{ type: 'i', value: Number(muted === undefined ? !talkback : !muted) }] })
    ]).catch(e => x32.log.error(e))
})

// Mute toggle response
// If message is a mute or toggle, update muted replicant
const muteRegex = /^\/ch\/(\d+)\/mix\/on$/;
const soloRegex = /^\/-stat\/solosw\/(\d+)$/;
listenTo("message", ({ address, args }) => {
    const muted = x32.replicants.muted;
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
listenTo("connected", () => {
    const channels = x32.replicants.channels;
    console.log("Loading tech toggles", channels.value.buses);
    if (!channels.value.buses) return;
    const techCh = String(channels.value.tech).padStart(2, "0");
    Object.entries(channels.value.buses).forEach(([k, b]) => {
        // Poll fader for each on startup
        const busStr = String(b).padStart(2, "0");
        const address = b === 0 ? `/ch/${techCh}/mix/fader` : `/ch/${techCh}/mix/${busStr}/level`
        x32.sendToMixer({ address, args: [] }, false).catch(e => x32.log.error(e));
    })
})

// Tech toggle send
listenTo("setTechMuted", async ({ bus, muted }) => {
    if (!(await x32.isConnected())) return;
    const channels = x32.replicants.channels;
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
    return await x32.sendToMixer({ address, args: [{ type: 'f', value: muted ? 0 : 0.75 }] }).catch(e => x32.log.error(e))
})

// Tech toggle response
// If message is about tech channel volume, record in techMuted
listenTo("message", ({ address, args }) => {
    const channels = x32.replicants.channels;
    const techStr = `/ch/${String(channels.value.tech).padStart(2, "0")}/mix/`;
    if (address.startsWith(techStr)) {  // If tech channel
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
                x32.replicants.techMuted.value[channel[0]] = !Boolean(typedArgs[0].value);
            }
        }
    }
});

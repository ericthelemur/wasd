import type NodeCG from '@nodecg/types';
import { Channels } from 'types/schemas';

import { listenTo } from '../common/listeners';
import { getNodeCG, getX32, Replicant, storeNodeCG } from './utils';

const x32 = getX32();

const channels = Replicant<Channels>("channels");

listenTo("muteToggle", ({ mic }) => {
    // mic like /ch/15/mix/on
    // response like { address: '/ch/15/mix/on', args: [ { type: 'i', value: 1 } ] }
    if (!channels.value || !channels.value.mics) return;
    const muteSwitch = channels.value.mics[mic];
    console.log("ms", muteSwitch);
    x32.sendMethod({ address: muteSwitch, args: [] }).then((r) => {
        const res = r as { address: string, args: { value: any; }[] };
        const currentlyMuted = res.args[0].value;
        x32.sendMethod({ address: muteSwitch, args: [{ type: 'i', value: Number(!currentlyMuted) }] })
    })
})
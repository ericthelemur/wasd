import type NodeCG from '@nodecg/types';
import { Message, MsgRef } from 'types/schemas';

import { getNodeCG } from '../../common/utils';
import { bank, current, pools, queue } from './replicants';

const QUEUE_LEN = 12;
const DISPLAY_TIME = 5000;
const nodecg = getNodeCG();

function lastQueued(time: number) {
    const nextTime = current.value.endTime;
    const times: { [id: string]: number } = {};
    queue.value.msgs.forEach((ref, i) => {
        times[ref.id] = nextTime + DISPLAY_TIME * i;
    });
    return times;
}

function pickNext(time: number) {
    const lastQueuedTimes = lastQueued(time);
    var maxRef: MsgRef | undefined;
    var maxMsg: Message | undefined;
    var maxPriority = 0;
    for (const pool of Object.values(pools.value)) {
        for (const ref of pool.msgs) {
            const msg = bank.value[ref.id];
            if (!msg) continue;
            const age = lastQueuedTimes[ref.id] || msg.lastShown || time - 5 * 60 * 10000;
            const timeSince = (time - age) / 1000;
            const weight = pool.priority * msg.priority * timeSince;

            if (maxPriority < weight) {
                maxPriority = weight;
                maxRef = ref;
                maxMsg = msg;
            }
        }
    }
    return maxRef;
}

// Add new to queue when below min length
queue.on("change", (val) => {
    if (val) {
        while (val.msgs.length < QUEUE_LEN) {
            const dispTime = Date.now() + DISPLAY_TIME * (val.msgs.length + 1);
            const next = pickNext(dispTime);
            if (next) {
                // nodecg.log.debug("Queueing", next);
                val.msgs.push({ id: next.id, time: Date.now() })
            }
        }
    }
});

// Keep current msg text up to date with bank
bank.on("change", (val) => {
    if (current.value && current.value.msgID) {
        const currRef = current.value.msgID;
        const bankMsg = bank.value[currRef];
        if (!bankMsg) return;
        if (current.value.text !== bankMsg.text) {
            current.value.text = bankMsg.text;
        }
    }
});

var interval: NodeJS.Timeout;
function playNext(): void {
    // nodecg.log.debug("Moving to next donation");
    if (queue.value.msgs) {
        const newRef = queue.value.msgs[0];
        if (!newRef) return nodecg.log.warn("Reading null value on queue");
        const newMsg = bank.value[newRef.id];
        if (!newMsg) return nodecg.log.warn("No message found for ref", newRef.id);
        if (newMsg.text == "New Message") {
            queue.value.msgs.splice(0, 1);
            return playNext();
        }

        current.value = {
            ...current.value,
            text: newMsg.text,
            msgID: newRef.id,
            endTime: Date.now() + DISPLAY_TIME,
            time: newRef.time
        }
        queue.value.msgs.splice(0, 1);
    }
    clearInterval(interval);
    interval = setInterval(playNextPause, DISPLAY_TIME);
}

function playNextPause() {
    if (!current.value.pause) playNext();
}

const now = Date.now();
if (current.value && !current.value.pause && current.value.endTime < now) playNextPause();

current.on("change", (newVal, oldVal) => {
    if (oldVal && oldVal.pause) {   // If was paused, and passing time, try playing
        if (newVal.endTime < Date.now()) playNextPause();
    }
})
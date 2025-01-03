import type NodeCG from '@nodecg/types';
import { Message, MsgRef } from 'types/schemas';

import { getNodeCG } from '../../common/utils';
import { bank, current, pools, queue } from './replicants';

import { TEXT_WIDTH_LOOKUP_TABLE } from './widths';
import { init } from 'server-text-width';

const { getTextWidth } = init(TEXT_WIDTH_LOOKUP_TABLE);

const QUEUE_LEN = 12;
export const DISPLAY_TIME = 10000;
const nodecg = getNodeCG();

function findLastQueuedTimes() {
    const nextTime = current.value.endTime;
    const times: { [id: string]: number } = {};
    let lastTime = nextTime;
    queue.value.msgs.forEach((ref) => {
        times[ref.id] = lastTime;
        lastTime += ref.duration ?? DISPLAY_TIME;
    });
    return { lastQueuedTimes: times, queueEnd: lastTime };
}

function pickNext() {
    const { lastQueuedTimes, queueEnd } = findLastQueuedTimes();
    var maxRef: MsgRef | undefined;
    var maxMsg: Message | undefined;
    var maxPriority = 0;
    for (const pool of Object.values(pools.value)) {
        for (const ref of pool.msgs) {
            const msg = bank.value[ref.id];
            if (!msg) continue;
            // Pull last shown age from time expected in queue, or time last displayed, or 5 mins ago if never shown
            const age = lastQueuedTimes[ref.id] || msg.lastShown || queueEnd - 5 * 60 * 10000;
            const timeSince = (queueEnd - age) / 1000;
            // Weight time by pool and message priority - pick weighted oldest
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
            const next = pickNext();
            if (next) {
                // nodecg.log.debug("Queueing", next);
                const msg = bank.value[next.id];
                const duration = Math.round(getTextWidth(msg.text) * 10);
                // const duration = DISPLAY_TIME // TODO: Flexible duration
                val.msgs.push({ id: next.id, time: Date.now(), duration: duration })
            }
        }
    }
});

// Keep current msg text up to date with bank
bank.on("change", (newBank) => {
    if (current.value && current.value.msgID) {
        const currRef = current.value.msgID;
        const bankMsg = newBank[currRef];
        if (!bankMsg) return;
        if (current.value.text !== bankMsg.text) {
            current.value.text = bankMsg.text;
        }
    }
});

var interval: NodeJS.Timeout;
function playNext(): void {
    // nodecg.log.debug("Moving to next donation");
    let duration = DISPLAY_TIME;    // Default duration (for timer below)
    if (queue.value.msgs) {
        // Fetch next message from queue
        const newRef = queue.value.msgs[0];
        if (!newRef) return nodecg.log.warn("Reading null value on queue");
        const newMsg = bank.value[newRef.id];
        if (!newMsg) return nodecg.log.warn("No message found for ref", newRef.id);
        if (newMsg.text == "New Message") {
            queue.value.msgs.splice(0, 1);
            return playNext();
        }
        if (newMsg.duration) duration = newRef.duration!;

        // Set current to top of queue
        current.value = {
            ...current.value,
            text: newMsg.text,
            msgID: newRef.id,
            startTime: Date.now(),
            endTime: Date.now() + duration,
            time: newRef.time
        }

        // Remove top from queue
        queue.value.msgs.splice(0, 1);
    }

    // Set interval for move to next
    clearInterval(interval);
    interval = setInterval(playNextPause, duration);
}

function playNextPause() {
    // Play next (unless paused)
    if (!current.value.pause) playNext();
}

// On startup, play next if unpaused and we are past the current value's time
const now = Date.now();
if (current.value && !current.value.pause && current.value.endTime < now) playNext();
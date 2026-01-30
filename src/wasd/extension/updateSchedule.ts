import { getNodeCG, getSpeedControlUtil } from '../../common/utils';
import { config, streamState } from './replicants';
const nodecg = getNodeCG();


function upcoming() {
    if (nodecg.extensions["nodecg-speedcontrol"] && config.value.updateMinsBehind) {
        const sc = getSpeedControlUtil();

        const currRun = sc.getCurrentRun();
        if (!currRun?.scheduledS) return;

        const timer = sc.timer.value.milliseconds || 0;
        const now = Date.now();

        const actualCurrRunStart = now - timer;
        const expectedCurrRunStart = currRun.scheduledS * 1000;

        const behind = expectedCurrRunStart - actualCurrRunStart;

        // nodecg.log.info(now, timer, currRun?.scheduledS, actualCurrRunStart, expectedCurrRunStart, behind);

        streamState.value.minsBehind = 5 * Math.round(behind / (1000 * 60 * 5));
        if (Math.abs(streamState.value.minsBehind) <= 15) streamState.value.minsBehind = 0;
    }
}

// function findRunIndex(arg?: RunData | string | null): number {
//     let runId = arg;
//     if (arg && typeof arg !== 'string') {
//         runId = arg.id;
//     }

//     const sc = getSpeedControlUtil();
//     return sc.runDataArray.value.findIndex((run) => run.id === runId);
// }

// function updateTimes() {
//     const minsBehind = streamState.value.minsBehind;
//     nodecg.log.info(minsBehind);
//     if (minsBehind === undefined) return;

//     const sc = getSpeedControlUtil();

//     const runs = sc.runDataArray.value.slice(findRunIndex(sc.getCurrentRun()));

//     runs.forEach(r => {
//         nodecg.log.info(minsBehind, r);
//         const run = r as RunData & { originalScheduledS?: number, originalScheduled?: string }
//         if (!run["originalScheduledS"]) {
//             run["originalScheduledS"] = run.scheduledS;
//             run["originalScheduled"] = run.scheduled;
//         }

//         if (run["originalScheduledS"]) {
//             run.scheduledS = run["originalScheduledS"] + minsBehind * 60;
//             run.scheduled = new Date(run.scheduledS * 1000).toISOString();
//         }
//         nodecg.log.info(run.scheduledS, run["originalScheduledS"], run);
//     });
// }

try {
    upcoming();
    setInterval(upcoming, 60 * 1000);
} catch (e) {
    nodecg.log.error(e);
}

config.on("change", (newVal, oldVal) => {
    if (newVal.updateMinsBehind !== oldVal?.updateMinsBehind) {
        // upcoming();
        // updateTimes();
    }
})
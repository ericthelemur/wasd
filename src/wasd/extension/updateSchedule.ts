import { getNodeCG, getSpeedControlUtil } from '../../common/utils';
import { config, streamState } from './replicants';
const nodecg = getNodeCG();


function upcoming() {
    nodecg.log.info("Try", Boolean(nodecg.extensions["nodecg-speedcontrol"]), config.value.updateMinsBehind);
    if (nodecg.extensions["nodecg-speedcontrol"] && config.value.updateMinsBehind) {
        const sc = getSpeedControlUtil();

        const currRun = sc.getCurrentRun();
        if (!currRun?.scheduledS) return;

        const timer = sc.timer.value.milliseconds || 0;
        const now = Date.now();
        const runs = sc.getNextRuns(1000);

        const actualCurrRunStart = now - timer;
        const expectedCurrRunStart = currRun.scheduledS * 1000;

        const behind = expectedCurrRunStart - actualCurrRunStart;

        nodecg.log.info(now, timer, currRun?.scheduledS, actualCurrRunStart, expectedCurrRunStart, behind);
        streamState.value.minsBehind = 5 * Math.round(behind / (1000 * 60 * 5));
    }
}

try {
    upcoming();
    setInterval(upcoming, 60 * 1000);
} catch (e) {
    nodecg.log.error(e);
}

config.on("change", (newVal, oldVal) => {
    if (newVal.updateMinsBehind && !oldVal?.updateMinsBehind) {
        upcoming();
    }
})
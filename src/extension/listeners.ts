import clone from 'clone';
import { RunData } from 'speedcontrol-util/types/speedcontrol';

import { sc, sceneData } from './replicants';
import { getNodeCG } from './utils';

function checkRun(run: RunData, assigned: { [scene: string]: RunData | null }) {
    const runScene = run.customData["scene"];
    if (runScene && Object.keys(assigned).includes(runScene)) {
        if (!assigned[runScene]) assigned[runScene] = run;
    }
}

function updateSceneRuns() {
    const assigned = Object.fromEntries(Object.keys(sceneData.value).map(k => [k, null]));
    const currRun = sc.getCurrentRun();
    if (currRun) checkRun(currRun, assigned);

    const upcomingRuns = sc.getNextRuns();
    // Check next runs (defaults to next 4)
    for (var i = 0; i < upcomingRuns.length; i++) {
        checkRun(upcomingRuns[i], assigned);
        // if (Object.values(assigned).every(v => v)) break;
    }
    getNodeCG().log.warn(assigned);
    if (JSON.stringify(sceneData.value) !== JSON.stringify(assigned)) {
        sceneData.value = clone(assigned);
    }
}

sc.runDataActiveRun.on("change", updateSceneRuns);
sc.runDataArray.on("change", updateSceneRuns);

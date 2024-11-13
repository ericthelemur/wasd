import clone from 'clone';
import { RunData } from 'speedcontrol-util/types/speedcontrol';
import { SceneData } from 'types/schemas';

import { getNodeCG } from '../../common/utils';
import { sc, sceneData } from './replicants';

function checkRun(run: RunData, assigned: SceneData) {
    const runSceneName = run.customData["scene"];
    if (runSceneName && assigned[runSceneName] && !assigned[runSceneName].run) {
        assigned[runSceneName].run = run;
    }
}

function updateSceneRuns() {
    if (!sceneData.value) return;
    const assigned: SceneData = Object.fromEntries(Object.keys(sceneData.value).map(k => [k, { name: k, run: null }]));
    const currRun = sc.getCurrentRun();
    if (currRun) checkRun(currRun, assigned);

    const upcomingRuns = sc.getNextRuns();
    // Check next runs (defaults to next 4)
    for (var i = 0; i < upcomingRuns.length; i++) {
        checkRun(upcomingRuns[i], assigned);
        // if (Object.values(assigned).every(v => v)) break;
    }
    // getNodeCG().log.warn(assigned);
    if (JSON.stringify(sceneData.value) !== JSON.stringify(assigned)) {
        sceneData.value = clone(assigned);
    }
}

sc.runDataActiveRun.on("change", updateSceneRuns);
sc.runDataArray.on("change", updateSceneRuns);

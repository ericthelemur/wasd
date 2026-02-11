import clone from 'clone';
import { RunData } from 'speedcontrol-util/types/speedcontrol';
import { SceneData } from 'types/schemas';

import { config, sceneData } from './replicants';
import { getNodeCG, getSpeedControlUtil } from '../../common/utils';
import { listenTo } from '../messages';
import { TwitchAPIData } from 'speedcontrol-util/types/speedcontrol/schemas';
import { obs } from '../../obs/extension/index.extension';

function checkRun(run: RunData, assigned: SceneData) {
    const runSceneName = run.customData["scene"];
    if (runSceneName && assigned[runSceneName] && !assigned[runSceneName].run) {
        assigned[runSceneName].run = run;
    }
}

function updateSceneRuns() {
    if (!sceneData.value) return;
    const sc = getSpeedControlUtil();
    const assigned: SceneData = Object.fromEntries(Object.entries(sceneData.value).map(([k, v]) => [k, { ...v, run: null }]));
    const currRun = sc.getCurrentRun();
    if (currRun) checkRun(currRun, assigned);

    const upcomingRuns = sc.getNextRuns(10);
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

const sc = getSpeedControlUtil();
sc.runDataActiveRun.on("change", updateSceneRuns);
sc.runDataArray.on("change", updateSceneRuns);



listenTo("addMarkerTwitch", async ({ name }) => {
    if (!config.value.placeTwitchMarkers) return;
    const nodecg = getNodeCG();
    const twitchData = nodecg.Replicant<TwitchAPIData>("twitchAPIData", "nodecg-speedcontrol");
    if (!twitchData || !twitchData.value || !twitchData.value.channelID) return;
    if (obs.replicants.status.value.connected != "connected" || !obs.replicants.status.value.streaming) return;

    try {
        nodecg.sendMessageToBundle("twitchAPIRequest", "nodecg-speedcontrol", {
            "method": "post",
            "endpoint": "/streams/markers",
            "data": {
                "user_id": twitchData.value.channelID,
                "description": name
            }
        });
    } catch (e) {
        nodecg.log.error("Error creating marker", e);
    }
})
import { getNodeCG, getSpeedControlUtil } from '../../common/utils';
import { sendTo } from '../messages';
import { OBSCommPoint } from './obs';

export const obs = new OBSCommPoint();

// Record when not in break
obs.obs.on("CurrentProgramSceneChanged", ({ sceneName }) => {
    if (obs.replicants.status.value.controlRecording) {
        if (sceneName == "BREAK" && obs.replicants.status.value.recording) sendTo("stopRecording");
        else if (sceneName != "BREAK" && !obs.replicants.status.value.recording) sendTo("startRecording");
    }
});


// getSpeedControlUtil().runDataActiveRun.on("change", async (newRun, oldRun) => {
//     if (!obs.replicants.status.value.controlRecording) return;
//     if (!)
//     if (!newRun?.category) return;
//     if (oldRun?.game == newRun?.game && oldRun?.category == newRun?.category) return    // Check ID as well?
//     if (obs.replicants.status.value.recording) {
//         sendTo("stopRecording");
//         await setTimeout(() => sendTo("startRecording"), 100);    // Wait a moment to start recording again
//     }
// });
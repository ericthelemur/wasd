import { getNodeCG } from '../../common/utils';
import { sendTo } from '../messages';
import { OBSUtility } from './obs';

export const obs = new OBSUtility(getNodeCG());

// Record when not in break
obs.on("CurrentProgramSceneChanged", ({ sceneName }) => {
    if (obs.replicants.obsStatus.value.controlRecording) {
        if (sceneName == "BREAK" && obs.replicants.obsStatus.value.recording) sendTo("stopRecording");
        else if (sceneName != "BREAK" && !obs.replicants.obsStatus.value.recording) sendTo("startRecording");
    }
});
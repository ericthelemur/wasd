import { Splits, Times } from 'types/schemas/livesplit';

import { getNodeCG, getSpeedControlUtil, sendError } from '../../common/utils';
import { listenTo } from '../messages';
import { splits } from './replicants';

const sc = getSpeedControlUtil();

listenTo("split", ({teamId, forfeit}, ack) => {
    if (!splits.value) return false;
    const newVal: Times[string] = {    // Record split time first, to be as close to click as possible
        state: forfeit ? "forfeit" : "completed",
        time: sc.timer.value.time,
        milliseconds: sc.timer.value.milliseconds
    };

    const currIndex = splits.value.current[teamId] || 0;
    if (currIndex >= splits.value.splits.length) sendError(ack, "Past end of splits");
    if (currIndex == splits.value.splits.length-1) {    // If last split, stop clock for team
        getNodeCG().sendMessageToBundle("timerStop", "nodecg-speedcontrol", { id: teamId });
    }
    // Go to next split for team
    splits.value.current[teamId] = currIndex + 1;
    // Record time for old split
    const currSplit = splits.value.splits[currIndex];
    currSplit.times[teamId] = newVal;
});
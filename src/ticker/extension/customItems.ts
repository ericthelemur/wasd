import { Message, MsgRef, Pool, Queue } from 'types/schemas';

import { getNodeCG, getSpeedControlUtil } from '../../common/utils';
import { listenTo, sendError, sendTo } from '../common/listeners';
import { addToPool, findMsgIDIndex } from './listeners';
import { bank, current, pools, queue } from './replicants';

const nodecg = getNodeCG();


if (nodecg.extensions["nodecg-speedcontrol"]) {
    const sc = getSpeedControlUtil();

    if (!pools.value["runs"]) {
        pools.value["runs"] = { name: "Upcoming Runs", priority: 0.5, msgs: [] };
    }

    sc.getNextRuns(3).forEach((run, i) => {
        const date = new Date(run.scheduled!);
        const dateStr = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true, hourCycle: "h11" });
        const runners = run.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. ");
        const term = ["next", "2nd", "3rd"][i];

        const msg = `${run.game} with ${runners} coming up ${term} at ${dateStr}`;
        const bid = "run-" + run.id;
        const existing = bank.value[bid];
        nodecg.log.info(bid, msg, Boolean(existing), findMsgIDIndex(pools.value.runs, bid));
        if (existing) {
            existing.text = msg;
        } else {
            const newVal = { text: msg, priority: Math.pow(2, 2 - i), lastShown: Date.now() + i * 60 * 1000 };
            nodecg.log.info(newVal);
            bank.value["run-" + run.id] = newVal;
        }


        if (findMsgIDIndex(pools.value.runs, bid) == -1) {
            addToPool({ id: bid }, pools.value.runs, null);
        }
    });
}
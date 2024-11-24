import { Message, MsgRef, Pool, Queue } from 'types/schemas';

import { getNodeCG, getSpeedControlUtil } from '../../common/utils';
import { addToPool, findMsgIDIndex } from './listeners';
import { bank, pools } from './replicants';

const nodecg = getNodeCG();


function upcoming() {
    if (nodecg.extensions["nodecg-speedcontrol"]) {
        const sc = getSpeedControlUtil();

        if (!pools.value["runs"]) {
            pools.value["runs"] = { name: "Upcoming Runs", priority: 0.5, msgs: [] };
        }

        sc.getNextRuns(3).forEach((run, i) => {
            const date = new Date(run.scheduled!);
            const dateStr = date.toLocaleTimeString(undefined, { hourCycle: "h12", hour: "numeric", minute: "2-digit" }).replaceAll(" ", "");
            const runners = run.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. ");
            const term = ["next", "2nd", "3rd"][i];

            const bid = "upcoming-" + i;
            const existing = bank.value[bid];
            const msg = `${run.game} ${runners ? "with " : ""}${runners} coming up ${term} at ${dateStr}`;

            if (existing && (existing.text != msg)) {
                existing.text = msg;
            } else {
                const newVal = { text: msg, priority: Math.pow(2, 2 - i), lastShown: Date.now() + i * 10 * 1000 };
                bank.value[bid] = newVal;
            }

            if (findMsgIDIndex(pools.value.runs, bid) == -1) {
                addToPool({ id: bid }, pools.value.runs, null);
            }
        });
    }
}

try {
    upcoming();
    setInterval(upcoming, 10 * 1000);
} catch (e) {
    nodecg.log.error(e);
}
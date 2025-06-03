import { Donation, Message, MsgRef, Pool, Queue } from 'types/schemas';
import SpeedcontrolUtil from 'speedcontrol-util';

import { getNodeCG, getSpeedControlUtil } from '../../common/utils';
import { addToPool, deleteMessage, findMsgIDIndex } from './listeners';
import { bank, pools, queue } from './replicants';
import { RunData } from 'speedcontrol-util/types/speedcontrol';
import { streamState } from '../../wasd/extension/replicants';
import { formatAmount, formatAmounts, formatTime } from '../../common/utils/formats';
import { sendTo } from '../messages';

const nodecg = getNodeCG();

function findRunIndex(arg: RunData | string | null | undefined, sc: SpeedcontrolUtil): number {
    let runId = arg;
    if (arg && typeof arg !== 'string') runId = arg.id;
    return sc.runDataArray!.value.findIndex((run) => run.id === runId);
}

function getNextRuns(amount = 4, sc: SpeedcontrolUtil) {
    const nextRun = sc.runDataActiveRunSurrounding.value.next;
    if (!nextRun) return [];
    let runIndex = findRunIndex(nextRun, sc);
    return sc.runDataArray.value.slice(runIndex, runIndex + amount);
}

function updateOrCreateMsg(groupid: string, msgid: string, text: string, delay?: number, msgPriority?: number, groupName?: string, groupPriority?: number) {
    if (!pools.value[groupid]) {
        pools.value[groupid] = { name: groupName || groupid, priority: groupPriority ?? 1, msgs: [] };
    }

    const existing = bank.value[msgid];
    if (existing && existing.text != text) {
        existing.text = text;
    } else {
        const newVal = { text: text, priority: msgPriority || 1, lastShown: Date.now() + 1000 * (delay ?? 0) };
        bank.value[msgid] = newVal;
    }

    if (findMsgIDIndex(pools.value[groupid], msgid) == -1) {
        addToPool({ id: msgid }, pools.value[groupid], null);
    }
}

function upcoming() {
    if (nodecg.extensions["nodecg-speedcontrol"]) {
        const sc = getSpeedControlUtil();

        const runs = getNextRuns(3, sc);
        for (let i = runs.length; i < 3; i++) {
            deleteMessage(`upcoming-${i}`);
        }

        const minsBehind = streamState.value.minsBehind || 0;
        let delay = true;

        runs.forEach((run, i) => {
            let dateStr = formatTime(new Date(run.scheduled!));
            const runners = run.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. ");
            const term = ["next", "2nd", "3rd"][i];

            if (!run.category) delay = false;

            if (delay && minsBehind) {
                const lateDateStr = new Date(run.scheduledS! * 1000 + (minsBehind ?? 0) * 60 * 1000);
                dateStr = `~~${dateStr}~~ ${formatTime(lateDateStr)}`;
            }
            let msg = `**${run.game}** ${runners ? "with " : ""}${runners} coming up ${term} at **${dateStr}**`;

            updateOrCreateMsg("runs", `upcoming-${i}`, msg, i * 10, Math.pow(2, 2 - i), "Upcoming Runs", 0.5);
        });
    }
}

nodecg.listenFor("show-dono", (dono: Donation) => {
    let msg = `Thanks ${dono.donor_name} for donating ${formatAmounts(dono.amount, dono.displayAmount)}!`;
    if (dono.donor_comment) msg += " They say: " + dono.donor_comment;
    sendTo("addMessage", { pid: "queue", before: queue.value.msgs[0] ?? null, text: msg });
})

function allintegrations() {
    upcoming();
}

try {
    allintegrations();
    setInterval(allintegrations, 10 * 1000);
} catch (e) {
    nodecg.log.error(e);
}
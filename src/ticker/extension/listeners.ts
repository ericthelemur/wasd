import { Message, MsgRef, Pool, Queue } from 'types/schemas';

import { getNodeCG } from '../../common/utils';
import { listenTo, sendError } from '../common/listeners';
import { bank, current, pools, queue } from './replicants';

const nodecg = getNodeCG();

// Utilities
function genID(prefix: string, exclusions: string[]) {
    var id;
    do {
        id = `${prefix}-${Math.floor(Math.random() * 100000000)}`;
    } while (exclusions.includes(id));
    return id;
}

function findMsgIDIndex(pool: Pool, id: string | null | undefined) {
    if (!id) return -1;
    return pool.msgs.findIndex(m => m.id === id);
}

function findMsgRefIndex(pool: Pool, ref: MsgRef | null | undefined) {
    if (!ref) return -1;
    return pool.msgs.findIndex(m => m.id === ref.id && m.time === ref.time);
}

function findQueueMsgIDIndexes(queue: Queue, id: string | null | undefined) {
    if (!id) return [];
    const pred = (m: MsgRef) => m.id === id;
    return queue.msgs.reduce<number[]>((m, e, i) => pred(e) ? [...m, i] : m, []);
}
const findQueueMsgRefIndex = findMsgRefIndex;


// Pools
const defaultPool: () => Pool = () => { return { name: "New Pool", priority: 0, msgs: [] } }
listenTo("addPool", () => {
    const id = genID("pool", Object.keys(pools.value));
    pools.value[id] = defaultPool();
})
listenTo("removePool", ({ pid }, ack) => {
    const pool: Pool = pools.value[pid];
    if (!pool) return sendError(ack, "Pool does not exist");
    if (!pool.msgs) return sendError(ack, "Empty pool before deleting");
    delete pools.value[pid];
})

function removeFromPool(ref: MsgRef | string, pool: Pool) {
    const ind = typeof ref === "string" ? findMsgIDIndex(pool, ref) : findMsgRefIndex(pool, ref);
    if (ind === -1) return null;
    const [rem] = pool.msgs.splice(ind, 1);
    return rem;
}

function addToPool(ref: MsgRef, pool: Pool, before: MsgRef | null): boolean {
    if (before === null) pool.msgs.push(ref);
    else {
        const dstIndex = findQueueMsgRefIndex(pool, before);
        // Fallback to add to end
        if (dstIndex === -1) return addToPool(ref, pool, null);
        pool.msgs.splice(dstIndex, 0, ref);
    }
    return true;
}

function movePool(source: Pool, dest: Pool, mid: MsgRef, before: MsgRef | null) {
    const elem = removeFromPool(mid, source);
    if (!elem) return false;
    return addToPool(elem, dest, before);
};

// Messages
const defaultMsg: () => Message = () => { return { text: "New Message", priority: 0 } }

listenTo("addMessage", ({ pid, before }, ack) => {
    const pool: Pool = pid === "queue" ? queue.value : pools.value[pid];
    if (!pool) return sendError(ack, "Pool does not exist");

    const temp = pid === "queue";
    const id = genID(temp ? "temp" : "msg", Object.keys(bank));
    const msg: Message = defaultMsg();
    if (temp) msg.type = "temp";

    bank.value[id] = msg;
    addToPool({ id: id }, pool, before);
    if (pools.value["archive"]) addToPool({ id: id }, pools.value["archive"], null);
})

listenTo("removeMessage", ({ mid, noArchive }, ack) => {
    if (!(mid in bank.value)) return sendError(ack, "Message does not exist");
    queue.value.msgs = queue.value.msgs.filter(m => m.id !== mid);
    const wasIn = Object.keys(pools.value).filter((name) => removeFromPool(mid, pools.value[name]));
    if (noArchive || (wasIn.length == 1 && wasIn[0] == "archive")) {
        delete bank.value[mid];
    } else if (pools.value["archive"]) {
        addToPool({ id: mid }, pools.value["archive"], null);
    }
})

listenTo("movePool", ({ aref: mid, oldpid, newpid, before }) => {
    movePool(pools.value[oldpid], pools.value[newpid], mid, before);
});

// Queue
listenTo("reorderQueue", ({ aref: mid, before }) => movePool(queue.value, queue.value, mid, before));
listenTo("enqueue", ({ mid, before }) => (addToPool({ id: mid, time: Date.now() }, queue.value, before)));
listenTo("dequeue", ({ aref }) => removeFromPool(aref, queue.value));
listenTo("skipTo", ({ aref }) => {
    const index = findQueueMsgRefIndex(queue.value, aref);
    if (index === -1) return;
    queue.value.msgs.splice(0, index);
})
listenTo("unlink", ({ aref }) => {
    const oldMsg = bank.value[aref.id];
    const newID = genID("temp", Object.keys(bank.value));
    bank.value[newID] = {
        "text": oldMsg.text,
        "priority": oldMsg.priority,
        "type": "temp"
    }
    const index = findQueueMsgRefIndex(queue.value, aref);
    queue.value.msgs[index] = { id: newID, time: Date.now() };
})
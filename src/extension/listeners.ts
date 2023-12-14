import { getNodeCG } from "./utils";
import { current, pools, bank, queue } from "./replicants";

import { AnnPool, AnnQueue, AnnRef, Announcement } from "types/schemas";
import NodeCG from "@nodecg/types";
import { listenTo, sendError } from "../common/listeners";
import type * as LT from "../common/listenerTypes";
const nodecg = getNodeCG();

// Utilities
function genID(prefix: string, exclusions: string[]) {
    var id;
    do {
        id = `${prefix}-${Math.floor(Math.random() * 100000000)}`;
    } while (exclusions.includes(id));
    return id;
}

function findAnnIDIndex(pool: AnnPool, id: string | null | undefined) {
    if (!id) return -1;
    return pool.announcements.findIndex(a => a.id === id);
}

function findAnnRefIndex(pool: AnnPool, ref: AnnRef | null | undefined) {
    if (!ref) return -1;
    return pool.announcements.findIndex(a => a.id === ref.id && a.time === ref.time);
}

function findQueueAnnIDIndexes(queue: AnnQueue, id: string | null | undefined) {
    if (!id) return [];
    const pred = (a: AnnRef) => a.id === id;
    return queue.announcements.reduce<number[]>((a, e, i) => pred(e) ? [...a, i] : a, []);
}
const findQueueAnnRefIndex = findAnnRefIndex;


// Pools
const defaultPool: () => AnnPool = () => { return { name: "New Pool", priority: 0, announcements: [] } }
listenTo("addPool", () => {
    const id = genID("pool", Object.keys(pools.value));
    pools.value[id] = defaultPool();
})
listenTo("removePool", ({ pid }, ack) => {
    const pool: AnnPool = pools.value[pid];
    if (!pool) return sendError(ack, "Pool does not exist");
    if (!pool.announcements) return sendError(ack, "Empty pool before deleting");
    delete pools.value[pid];
})

function removeFromPool(ref: AnnRef | string, pool: AnnPool) {
    const ind = typeof ref === "string" ? findAnnIDIndex(pool, ref) : findAnnRefIndex(pool, ref);
    if (ind === -1) return null;
    const [rem] = pool.announcements.splice(ind, 1);
    return rem;
}

function addToPool(ref: AnnRef, pool: AnnPool, before: AnnRef | null) {
    if (before === null) pool.announcements.push(ref);
    else {
        const dstIndex = findQueueAnnRefIndex(pool, before);
        // Fallback to add to end
        if (dstIndex === -1) return addToPool(ref, pool, null);
        pool.announcements.splice(dstIndex, 0, ref);
    }
    return true;
}

function movePool(source: AnnPool, dest: AnnPool, aid: AnnRef, before: AnnRef | null) {
    const elem = removeFromPool(aid, source);
    if (!elem) return false;
    return addToPool(elem, dest, before);
};

// Announcements
const defaultAnn: () => Announcement = () => { return { text: "New Announcement", priority: 0 } }

listenTo("addAnnouncement", ({ pid, before }, ack) => {
    const pool: AnnPool = pools.value[pid];
    if (!pool) return sendError(ack, "Pool does not exist");

    const temp = pid === "queue";
    const id = genID(temp ? "temp" : "ann", Object.keys(bank));
    const ann: Announcement = defaultAnn();
    if (temp) ann.type = "temp";

    bank.value[id] = ann;
    addToPool({ id: id }, pool, before);
})

listenTo("removeAnnouncement", ({ aid }, ack) => {
    if (!(aid in bank.value)) return sendError(ack, "Announcement does not exist");
    Object.values(pools.value).forEach(pool => removeFromPool(aid, pool));
    queue.value.announcements = queue.value.announcements.filter(a => a.id !== aid);
    delete bank.value[aid];
})

listenTo("movePool", ({ aref: aid, oldpid, newpid, before }) => {
    movePool(pools.value[oldpid], pools.value[newpid], aid, before);
});

// Queue
listenTo("reorderQueue", ({ aref: aid, before }) => movePool(queue.value, queue.value, aid, before));
listenTo("enqueue", ({ aid, before }) => (addToPool({ id: aid, time: Date.now() }, queue.value, before)));
listenTo("dequeue", ({ aref }) => removeFromPool(aref, queue.value));
listenTo("skipTo", ({ aref }) => {
    const index = findQueueAnnRefIndex(queue.value, aref);
    if (index === -1) return;
    queue.value.announcements.splice(0, index);
})
listenTo("unlink", ({ aref }) => {
    const oldAnn = bank.value[aref.id];
    const newID = genID("temp", Object.keys(bank.value));
    bank.value[newID] = {
        "text": oldAnn.text,
        "priority": oldAnn.priority,
        "type": "temp"
    }
    const index = findQueueAnnRefIndex(queue.value, aref);
    queue.value.announcements[index] = { id: newID, time: Date.now() };
})
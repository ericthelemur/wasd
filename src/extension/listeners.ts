import { getNodeCG } from "./utils";
import { current, pools, bank, queue } from "./replicants";

import { AnnPool, AnnRef, Announcement } from "types/schemas";
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


// Pools
const defaultPool: () => AnnPool = () => { return { name: "New Pool", priority: 0, announcements: [] } }
listenTo<LT.AddPool>("addPool", () => {
    const id = genID("pool", Object.keys(pools.value));
    pools.value[id] = defaultPool();
})
listenTo<LT.RemovePool>("removePool", ({ pid }, ack) => {
    const pool: AnnPool = pools.value[pid];
    if (!pool) return sendError(ack, "Pool does not exist");
    if (!pool.announcements) return sendError(ack, "Empty pool before deleting");
    delete pools.value[pid];
})

// Announcements
const defaultAnn: () => Announcement = () => { return { text: "New Announcement", priority: 0 } }

listenTo<LT.AddAnnouncement>("addAnnouncement", ({ pid, after }, ack) => {
    const pool: AnnPool = pools.value[pid];
    if (!pool) return sendError(ack, "Pool does not exist");

    const temp = pid === "queue";
    const id = genID(temp ? "temp" : "ann", Object.keys(bank));
    const ann: Announcement = defaultAnn();
    if (temp) ann.type = "temp";

    bank.value[id] = ann;
    const index = after === null ? -1 :
        pool.announcements.findIndex(a => a.id === after.id && a.time === after.time);
    pool.announcements.splice(index + 1, 0, { id: id });
})

listenTo<LT.RemoveAnnouncement>("removeAnnouncement", ({ aid }, ack) => {
    if (!(aid in bank.value)) return sendError(ack, "Announcement does not exist");
    Object.values(pools.value).forEach(pool => {
        pool.announcements = pool.announcements.filter(a => a.id !== aid);
    });
    queue.value.announcements = queue.value.announcements.filter(a => a.id !== aid);
    delete bank.value[aid];
})
nodecg.listenFor("reorderQueue", () => { })
nodecg.listenFor("reorder", () => { })
nodecg.listenFor("enqueue", () => { })
nodecg.listenFor("dequeue", () => { })
nodecg.listenFor("unlink", () => { })
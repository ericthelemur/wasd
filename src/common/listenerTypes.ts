import { AnnRef } from "types/schemas";

export type LTs = {
    addPool: {}

    removePool: {
        pid: string
    }

    addAnnouncement: {
        pid: string;
        before: AnnRef | null;
    }

    removeAnnouncement: {
        aid: string;
    }

    reorderQueue: {
        aref: AnnRef;
        before: AnnRef | null;
    }

    movePool: {
        aref: AnnRef,
        oldpid: string;
        newpid: string;
        before: AnnRef | null;
    }

    enqueue: {
        aid: string;
        before: AnnRef | null;
    }

    dequeue: {
        aref: AnnRef;
    }

    skipTo: {
        aref: AnnRef;
    }

    unlink: {
        aref: AnnRef;
    }
}
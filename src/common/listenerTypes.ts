import { AnnRef } from "types/schemas";

export type LTs = {
    addPool: {
        name: "addPool",
        type: {}
    }

    removePool: {
        name: "removePool",
        type: {
            pid: string
        }
    }

    addAnnouncement: {
        name: "addAnnouncement",
        type: {
            pid: string;
            after: AnnRef | null;
        }
    }

    removeAnnouncement: {
        name: "removeAnnouncement",
        type: {
            aid: string;
        }
    }
}
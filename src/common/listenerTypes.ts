import { AnnRef } from "types/schemas";

export type Base = {
    name: string,
    type: object
}

export type LTs = AddPool | RemovePool | AddAnnouncement | RemoveAnnouncement;

export type AddPool = {
    name: "addPool",
    type: {}
}

export type RemovePool = {
    name: "removePool",
    type: {
        pid: string
    }
}

export type AddAnnouncement = {
    name: "addAnnouncement",
    type: {
        pid: string;
        after: AnnRef | null;
    }
}

export type RemoveAnnouncement = {
    name: "removeAnnouncement",
    type: {
        aid: string;
    }
}
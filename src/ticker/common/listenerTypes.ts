import { MsgRef } from 'types/schemas';

export type LTs = {
    addPool: {}

    removePool: {
        pid: string
    }

    addMessage: {
        pid: string;
        before: MsgRef | null;
    }

    removeMessage: {
        mid: string;
        noArchive?: boolean;
    }

    reorderQueue: {
        aref: MsgRef;
        before: MsgRef | null;
    }

    movePool: {
        aref: MsgRef,
        oldpid: string;
        newpid: string;
        before: MsgRef | null;
    }

    enqueue: {
        mid: string;
        before: MsgRef | null;
    }

    dequeue: {
        aref: MsgRef;
    }

    skipTo: {
        aref: MsgRef;
    }

    unlink: {
        aref: MsgRef;
    }
}
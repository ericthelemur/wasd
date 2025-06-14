import { createMessageListeners } from '../common/messages';
import { MsgRef } from 'types/schemas';

export type ListenerTypes = {
    addPool: {}

    removePool: {
        pid: string
    }

    addMessage: {
        pid: string;
        before: MsgRef | null;
        text?: string;
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

export const { sendTo, sendToF, listenTo } = createMessageListeners<ListenerTypes>();
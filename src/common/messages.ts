import NodeCG from '@nodecg/types';
import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

import { addPrefix, getNodeCG } from './utils';

var ncg: NodeCGAPIClient | NodeCG.ServerAPI;
declare var nodecg: NodeCGAPIClient;
try {
    ncg = nodecg;
} catch {
    ncg = getNodeCG();
}

type Listener<T> = (data: T, ack: NodeCG.Acknowledgement | undefined) => void;
type Dict = { [name: string]: unknown };


// Used in sendTo def
type NotUndefined<X extends Dict> = { [P in keyof X]: X[P] extends undefined ? P : never }[keyof X];

export type ListenersT<X extends Dict> = {
    listenTo: <T extends keyof X & string>(name: T, listener: Listener<X[T]>, prefix?: string) => void;
    sendToF: <T extends keyof X & string>(name: T, data: X[T], prefix?: string) => (() => void | Promise<unknown>);
    sendTo: {       // Cursed type to allow omitting data value for messages that don't have args
        <T extends NotUndefined<X>>(name: T, data?: undefined, prefix?: string): void;
        <T extends keyof X>(name: T, data: X[T], prefix?: string): void;
    };
}

export function createMessageListeners<X extends Dict>(): ListenersT<X> {
    // Deprecated
    function listenTo<T extends keyof X & string>(name: T, listener: Listener<X[T]>, prefix: string | undefined = undefined) {
        const prename = addPrefix(prefix, name);
        ncg.listenFor(prename, (data, ack) => {
            console.debug("Calling", prename, "with", data);
            listener(data, ack);
        })
    }

    function sendToF<T extends keyof X & string>(name: T, data: X[T], prefix: string | undefined = undefined) {
        const prename = addPrefix(prefix, name);
        return () => {
            console.log("Sending", prename, "with", data);
            return ncg.sendMessage(prename, data);
        }
    }

    function sendTo(name: string, data: any, prefix?: string) {
        return sendToF(name, data, prefix)();
    }

    return { listenTo, sendTo, sendToF }
}


export function createMessageListenersBundle<X extends Dict>(namespace?: string, log?: NodeCG.Logger): ListenersT<X> {
    const logger = log || getNodeCG().log;  // If logger not provided, use generic
    const bundle = namespace || "wasd";

    function listenTo<T extends keyof X & string>(name: T, listener: Listener<X[T]>) {
        ncg.listenFor(name, bundle, (data, ack) => {
            logger.info("Calling", bundle, name, "with", data);
            listener(data, ack);
        })
    }

    function sendToF<T extends keyof X & string>(name: T, data: X[T]) {
        return () => {
            logger.info("Sending", bundle, name, "with", data);
            return ncg.sendMessageToBundle(name, bundle, data);
        }
    }

    function sendTo(name: string, data: any) {
        return sendToF(name, data)();
    }

    return { listenTo, sendTo, sendToF }
}



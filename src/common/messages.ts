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
        <T extends NotUndefined<X>>(name: T, data?: undefined, prefix?: string): void | Promise<unknown>;
        <T extends keyof X>(name: T, data: X[T], prefix?: string): void | Promise<unknown>;
    };
}

export function createMessageListeners<X extends Dict>(): ListenersT<X> {
    // Deprecated
    function listenTo<T extends keyof X & string>(name: T, listener: Listener<X[T]>, prefix: string | undefined = undefined) {
        const prename = addPrefix(prefix, name);
        ncg.listenFor(prename, (data, ack) => {
            console.debug("Calling", prename, "with", data);
            try {
                listener(data, ack);
            } catch (e) {
                console.log(`Error handling to ${name} ${e}`);
            }
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

export function createMessageListenersBundle<X extends Dict>(namespace?: string, noLogList: (keyof X)[] = []): ListenersT<X> {
    const bundle = namespace || "wasd";
    const logger = new (getNodeCG().Logger)(bundle);

    function listenTo<T extends keyof X & string>(name: T, listener: Listener<X[T]>) {
        ncg.listenFor(name, bundle, (data, ack) => {
            if (!noLogList.includes(name)) logger.info("Calling", bundle, name, data == undefined ? "" : "with", data == undefined ? "" : data);
            try {
                listener(data, ack);
            } catch (e) {
                console.log(`Error handling to ${name} ${e}`);
            }
        })
    }

    function sendToF<T extends keyof X & string>(name: T, data: X[T]) {
        return () => {
            if (!noLogList.includes(name)) logger.info("Sending", bundle, name, data == undefined ? "" : "with", data == undefined ? "" : data);
            return ncg.sendMessageToBundle(name, bundle, data);
        }
    }

    function sendTo(name: string, data: any) {
        return sendToF(name, data)();
    }

    return { listenTo, sendTo, sendToF }
}

// Separate function as only used occasionally
export function createUnlistener<X extends Dict>(namespace?: string) {
    const bundle = namespace || "wasd";
    const logger = new (getNodeCG().Logger)(bundle);
    function unlistenTo<T extends keyof X & string>(name: T, listener: Listener<X[T]>) {
        logger.debug("Removing listener from", name, "for", listener);
        ncg.unlisten(name, listener);
    }
    return unlistenTo;
}



import NodeCG from '@nodecg/types';
import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

import { getNodeCG } from './utils';

var ncg: NodeCGAPIClient | NodeCG.ServerAPI;
declare var nodecg: NodeCGAPIClient;
try {
    ncg = nodecg;
} catch {
    ncg = getNodeCG();
}

type Listener<T> = (data: T, ack: NodeCG.Acknowledgement | undefined) => void;
type Dict = { [name: string]: unknown };


export function createMessageListeners<X extends Dict>() {
    function listenTo<T extends keyof X & string>(name: T, listener: Listener<X[T]>, prefix: string | undefined = undefined) {
        const prename = prefix ? `${prefix}:${name}` : name;
        ncg.listenFor(prename, (data, ack) => {
            console.debug("Calling", prename, "with", data);
            listener(data, ack);
        })
    }


    function sendToF<T extends keyof X & string>(name: T, data: X[T], prefix: string | undefined = undefined) {
        const prename = prefix ? `${prefix}:${name}` : name;
        return () => {
            console.debug("Sending", prename, "with", data);
            return ncg.sendMessage(prename, data);
        }
    }

    // Cursed type which enforces name and data matching the type dictionary, but also allows not passing data when undefined
    type NotUndefined = { [P in keyof X]: X[P] extends undefined ? P : never }[keyof X];
    function sendTo<T extends NotUndefined>(name: T, data?: undefined, prefix?: string): void;
    function sendTo<T extends keyof X>(name: T, data: X[T], prefix?: string): void;

    function sendTo(name: string, data: any, prefix?: string) {
        return sendToF(name, data, prefix)();
    }

    return { listenTo, sendTo, sendToF }
}



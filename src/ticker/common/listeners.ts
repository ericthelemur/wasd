import NodeCG from "@nodecg/types";
import { MsgRef } from "types/schemas";
import { LTs } from "./listenerTypes";
import { getNodeCG } from "../extension/utils";
import { NodeCGAPIClient } from "@nodecg/types/client/api/api.client";

var ncg: NodeCGAPIClient | NodeCG.ServerAPI;
declare var nodecg: NodeCGAPIClient;
try {
    ncg = nodecg;
} catch {
    ncg = getNodeCG();
}

type Listener<T> = (data: T, ack: NodeCG.Acknowledgement | undefined) => void;

export function sendError(ack: NodeCG.Acknowledgement | undefined, msg: string) {
    if (ack && !ack.handled) ack(new Error(msg));
}

export function sendSuccess<T>(ack: NodeCG.Acknowledgement | undefined, value: T) {
    if (ack && !ack.handled) ack(null, value);
}

export function listenTo<T extends keyof LTs>(name: T, listener: Listener<LTs[T]>) {
    ncg.listenFor(name, (data, ack) => {
        console.debug("Calling", name, "with", data);
        listener(data, ack);
    })
}


export function sendToF<T extends keyof LTs>(name: T, data: LTs[T]) {
    return () => {
        console.debug("Sending", name, "with", data);
        ncg.sendMessage(name, data);
    }
}

export function sendTo<T extends keyof LTs>(name: T, data: LTs[T]) {
    sendToF(name, data)();
}

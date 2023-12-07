import NodeCG from "@nodecg/types";
import { AnnRef } from "types/schemas";
import { LTs, Base } from "./listenerTypes";
import { getNodeCG } from "../extension/utils";

const nodecg = getNodeCG();

type Listener<T> = (data: T, ack: NodeCG.Acknowledgement | undefined) => void;

export function sendError(ack: NodeCG.Acknowledgement | undefined, msg: string) {
    if (ack && !ack.handled) ack(new Error(msg));
}

export function sendSuccess<T>(ack: NodeCG.Acknowledgement | undefined, value: T) {
    if (ack && !ack.handled) ack(null, value);
}

export function listenTo<T extends LTs>(name: T['name'], listener: Listener<T['type']>) {
    nodecg.listenFor(name, (data, ack) => {
        console.debug("Calling", name, "with", data);
        listener(data, ack);
    })
}


export function sendToF<T extends LTs>(name: T['name'], data: T['type']) {
    return () => {
        console.debug("Sending", name, "with", data);
        nodecg.sendMessage(name, data);
    }
}

export function sendTo<T extends LTs>(name: T['name'], data: T['type']) {
    sendToF(name, data)();
}

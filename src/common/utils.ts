import type NodeCG from '@nodecg/types';
import type { Configschema } from '../types/schemas';
import fs from 'fs';
import path from 'path';
import SpeedcontrolUtil from 'speedcontrol-util';
import { NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';


// Define typed replicant, find schema in schemas/component/name.json
export function Replicant<T>(name: string, component: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    const path = args["schemaPath"] ? args["schemaPath"] : buildSchemaPath(component, name);
    if (!fs.existsSync(path)) nodecg.log.error(`Cannot find schema ${path} for replicant ${component}/${name}`);
    return nodecg.Replicant<T>(name, { "schemaPath": path, ...args }) as unknown as NodeCG.ServerReplicantWithSchemaDefault<T>;
}


export function PrefixedReplicant<T>(prefix: string, name: string, component: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    const prefixed = prefix ? `${prefix}:${name}` : name;
    return Replicant<T>(prefixed, component, { schemaPath: buildSchemaPath(component, name), ...args });
}


// NodeCG Message send error or success ack
export function sendError(ack: NodeCG.Acknowledgement | undefined, msg: string) {
    if (ack && !ack.handled) ack(new Error(msg));
}

export function sendSuccess<T>(ack: NodeCG.Acknowledgement | undefined, value: T) {
    if (ack && !ack.handled) ack(null, value);
}


// Store NodeCG Singleton
let nodecg: NodeCG.ServerAPI<Configschema>;

export function storeNodeCG(ncg: NodeCG.ServerAPI<Configschema>) {
    nodecg = ncg;
    speedcontrolUtil = new SpeedcontrolUtil(ncg as unknown as NodeCGServer);
}

export function getNodeCG(): NodeCG.ServerAPI<Configschema> {
    return nodecg;
}


// Store SpeedControl Singleton
let speedcontrolUtil: SpeedcontrolUtil;

export function getSpeedControlUtil(): SpeedcontrolUtil {
    return speedcontrolUtil;
}

export function buildSchemaPath(parent: string, schemaName: string) {
    const p = path.resolve(process.cwd(), 'bundles', 'wasd', 'schemas', parent, `${encodeURIComponent(schemaName)}.json`);
    return p;
}


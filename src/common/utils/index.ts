import type NodeCG from '@nodecg/types';
import type { Configschema } from '../../types/schemas';
import fs from 'fs';
import path from 'path';
import SpeedcontrolUtil from 'speedcontrol-util';
import { NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';

export type NoNulls<T> = { [P in keyof T]: NonNullable<T[P]>; };
export type AllNulls<T> = { [P in keyof T]: null; };

// Define typed replicant, find schema in schemas/component/name.json
export function Replicant<T>(name: string, component: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    const path = args["schemaPath"] ? args["schemaPath"] : buildSchemaPath(component, name);
    if (!fs.existsSync(path)) ncg.log.error(`Cannot find schema ${path} for replicant ${component}/${name}`);
    return ncg.Replicant<T>(name, { "schemaPath": path, ...args }) as unknown as NodeCG.ServerReplicantWithSchemaDefault<T>;
}

export function BundleReplicant<T>(name: string, namespace: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    const path = args["schemaPath"] ? args["schemaPath"] : buildSchemaPath(namespace, name);
    if (!fs.existsSync(path)) ncg.log.error(`Cannot find schema ${path} for replicant ${namespace}/${name}`);
    return ncg.Replicant<T>(name, namespace, { "schemaPath": path, ...args }) as unknown as NodeCG.ServerReplicantWithSchemaDefault<T>;
}

export function addPrefix(prefix: string | undefined, name: string) {
    return prefix ? `${prefix}:${name}` : name;
}

export function PrefixedReplicant<T>(prefix: string, name: string, component: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    const prefixed = addPrefix(prefix, name);
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
let ncg: NodeCG.ServerAPI<Configschema>;    // For server
declare const nodecg: NodeCG.ClientAPI<Configschema>;   // For browser

export function storeNodeCG(nodecgObj: NodeCG.ServerAPI<Configschema>) {
    ncg = nodecgObj;
}

export function getNodeCG(): NodeCG.ServerAPI<Configschema> {
    return ncg || nodecg;
}


// Store SpeedControl Singleton
let speedcontrolUtil: SpeedcontrolUtil;

export function getSpeedControlUtil(): SpeedcontrolUtil {
    if (!speedcontrolUtil) {
        const anyNCG = (ncg as any);
        if (!("extensions" in anyNCG)) anyNCG.extensions = anyNCG.extension;
        speedcontrolUtil = new SpeedcontrolUtil(anyNCG as NodeCGServer);
    }
    return speedcontrolUtil;
}

export function buildSchemaPath(parent: string, schemaName: string) {
    // const p = path.resolve(process.cwd(), 'bundles', 'wasd', 'src', parent, 'schemas', `${encodeURIComponent(schemaName)}.json`);
    const p = path.resolve(process.cwd(), 'src', parent, 'schemas', `${encodeURIComponent(schemaName)}.json`);
    return p;
}


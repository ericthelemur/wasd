import type NodeCG from '@nodecg/types';
import type { Configschema } from '../types/schemas';
import fs from 'fs';
import path from 'path';
import SpeedcontrolUtil from 'speedcontrol-util';
import { NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';

let nodecg: NodeCG.ServerAPI<Configschema>;
let speedcontrolUtil: SpeedcontrolUtil;

export function storeNodeCG(ncg: NodeCG.ServerAPI<Configschema>) {
    nodecg = ncg;
    speedcontrolUtil = new SpeedcontrolUtil(ncg as unknown as NodeCGServer);
}

export function getNodeCG(): NodeCG.ServerAPI<Configschema> {
    return nodecg;
}

export function getSpeedControlUtil(): SpeedcontrolUtil {
    return speedcontrolUtil;
}

export function prefixName(prefix: string | undefined, name: string) {
    return prefix ? `${prefix}:${name}` : name;
}

export function buildSchemaPath(parent: string, schemaName: string) {
    const p = path.resolve(process.cwd(), 'bundles', 'wasd', 'schemas', parent, `${encodeURIComponent(schemaName)}.json`);
    return p;
}

export function Replicant<T>(name: string, component: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    const path = args["schemaPath"] ? args["schemaPath"] : buildSchemaPath(component, name);
    if (!fs.existsSync(path)) nodecg.log.error(`Cannot find schema ${path} for replicant ${component}/${name}`);
    return nodecg.Replicant<T>(name, { "schemaPath": path, ...args }) as unknown as NodeCG.ServerReplicantWithSchemaDefault<T>;
}


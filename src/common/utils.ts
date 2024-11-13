import type NodeCG from '@nodecg/types';
import type { Configschema } from '../types/schemas';
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

function buildSchemaPath(parent: string, schemaName: string) {
    const p = path.resolve(process.cwd(), 'bundles', 'wasd', 'schemas', parent, `${encodeURIComponent(schemaName)}.json`);
    return p;
}

export function Replicant<T>(name: string, component: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    return nodecg.Replicant<T>(name, { "schemaPath": buildSchemaPath(component, name), ...args }) as unknown as NodeCG.ServerReplicantWithSchemaDefault<T>;
}


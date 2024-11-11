import type NodeCG from '@nodecg/types';
import type { Configschema } from '../types/schemas';
import path from 'path';

let nodecg: NodeCG.ServerAPI<Configschema>;

export function storeNodeCG(ncg: NodeCG.ServerAPI<Configschema>) {
    nodecg = ncg;
}

export function getNodeCG(): NodeCG.ServerAPI<Configschema> {
    return nodecg;
}

export function prefixName(prefix: string | undefined, name: string) {
    return prefix ? `${prefix}:${name}` : name;
}

function buildSchemaPath(parent: string, schemaName: string) {
    const p = path.resolve(process.cwd(), 'bundles', 'wasd', 'schemas', parent, `${encodeURIComponent(schemaName)}.json`);
    console.log(p);
    return p;
}

export function Replicant<T>(name: string, component: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    return nodecg.Replicant<T>(name, { "schemaPath": buildSchemaPath(component, name), ...args }) as unknown as NodeCG.ServerReplicantWithSchemaDefault<T>;
}

import type NodeCG from '@nodecg/types';
import type { Configschema } from '../types/schemas';
import { X32Utility } from './X32';

let nodecg: NodeCG.ServerAPI<Configschema>;

export function storeNodeCG(ncg: NodeCG.ServerAPI<Configschema>) {
    nodecg = ncg;
}

export function getNodeCG(): NodeCG.ServerAPI<Configschema> {
    return nodecg;
}

let storedX32: X32Utility;

export function storeX32(x32: X32Utility) {
    storedX32 = x32;
}

export function getX32(): X32Utility {
    return storedX32;
}

export function prefixName(prefix: string | undefined, name: string) {
    return prefix ? `${prefix}:${name}` : name;
}

export function Replicant<T>(name: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    return nodecg.Replicant<T>(name, args) as unknown as NodeCG.ServerReplicantWithSchemaDefault<T>;
}

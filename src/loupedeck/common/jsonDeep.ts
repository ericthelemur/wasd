import NodeCG from '@nodecg/types';
import { getNodeCG } from '../../common/utils';

const log = new (getNodeCG().Logger)("loupedeck");

export function getParentAt<T>(root: T, path: string | string[]): [any, string] {
    let val: any = root;
    try { // Jankily parse JSON path
        let parts = typeof path == "string" ? path.split(/\.|\/|\\|\[|\]/) : path;
        const child = parts[parts.length - 1];
        if (parts.length == 1) return [val, child]
        parts = parts.slice(0, parts.length - 1);
        for (let part of parts) {
            const partKey = part.match(/\d+/) ? Number(part) : part;
            val = val[partKey];
            log.info(part, val);
        }
        return [val, child];
    } catch {
        return [undefined, ""];
    }
}

export function getRepParentAt<T>(rep: NodeCG.ServerReplicant<T>, path: string | string[]): [any, string] {
    let val: any = rep.value; // Start at rep root, traverse down repeatedly
    return getParentAt(val, path);
}

export function getRepValAt<T>(rep: NodeCG.ServerReplicant<T>, path: string | string[]) {
    const [val, child] = getRepParentAt(rep, path);
    if (!val) return undefined;
    try {
        return val[child];
    } catch {
        return undefined;
    }
}
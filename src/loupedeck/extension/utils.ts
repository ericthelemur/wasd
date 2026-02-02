import NodeCG from '@nodecg/types';

import { NodecgReplicant } from '../../types/schemas/loupedeck';
import { loupedeck } from './index.extension';
import { getCellState } from './stateChecker';
import { Replicant } from '../../common/utils';

export function getCellStateData(index: number) {
    const page = loupedeck.getCurrentPage();
    if (!page) return;
    const states = page.screen[index]?.states;
    const stateKey = getCellState(index);
    if (!states || !stateKey) return;
    return states[stateKey];
}

export function getReplicant(rep: NodecgReplicant["replicant"]) {
    loupedeck.log.info("Getting replicant", rep);
    if (typeof rep == "object" && rep.bundle) { // If has bundle passed, create in namespace
        loupedeck.log.info("Bundle replicant", rep.replicant, rep.bundle);
        return Replicant(rep.replicant, rep.bundle);
    } else {
        const name = typeof rep == "object" ? rep.replicant : rep;  // If not, create in this namespace
        loupedeck.log.info("Replicant", name);
        return Replicant(name, "wasd");
    }
}

export function getRepParentAt<T>(rep: NodeCG.ServerReplicantWithSchemaDefault<T>, path: string | string[]): [any, string] {
    let val: any = rep.value; // Start at rep root, traverse down repeatedly
    try { // Jankily parse JSON path
        let parts = typeof path == "string" ? path.split(/\.|\/|\\|\[|\]/) : path;
        loupedeck.log.info(parts);
        const child = parts[parts.length - 1];
        if (parts.length == 1) return [val, child]
        parts = parts.slice(0, parts.length - 1);
        for (let part of parts) {
            const partKey = part.match(/\d+/) ? Number(part) : part;
            val = val[partKey];
            loupedeck.log.info(part, val);
        }
        return [val, child];
    } catch {
        return [undefined, ""];
    }
}

export function getRepValAt<T>(rep: NodeCG.ServerReplicantWithSchemaDefault<T>, path: string | string[]) {
    const [val, child] = getRepParentAt(rep, path);
    if (!val) return undefined;
    try {
        return val[child];
    } catch {
        return undefined;
    }
}
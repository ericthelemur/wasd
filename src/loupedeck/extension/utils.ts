import NodeCG from '@nodecg/types';

import { NodecgReplicant } from '../../types/schemas/loupedeck';
import { loupedeck } from './index.extension';
import { getCellState } from './stateChecker';
import { getNodeCG } from '../../common/utils';

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
        // return Replicant(rep.replicant, rep.bundle);
        return getNodeCG().Replicant(rep.replicant, rep.bundle);
    } else {
        const name = typeof rep == "object" ? rep.replicant : rep;  // If not, create in this namespace
        loupedeck.log.info("Replicant", name);
        return getNodeCG().Replicant(name);
    }
}

import { log } from 'console';
import { ValueOf } from 'ts-essentials';

import { getNodeCG } from '../../common/utils';
import { CellData, Condition } from '../../types/schemas/loupedeck';
import { listenTo } from '../messages';
import { loupedeck } from './index.extension';
import { redrawIfNecessary } from './redraw';
import { getReplicant, getRepValAt } from './utils';

import type NodeCG from '@nodecg/types';
const nodecg = getNodeCG();

type CellRep = { [name: string]: NodeCG.ServerReplicantWithSchemaDefault<unknown> };
const cellReplicants: CellRep[] = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];

function getOrAddRep(index: number, key: string, rep: ValueOf<NonNullable<CellData["replicants"]>>) {
    // Fetch or create replicant for specific cell - subscribes to changes

    const cellReps = cellReplicants[index];
    if (!(key in cellReps)) {   // Create if not existing
        loupedeck.log.info("Adding replicant for", index, "key", key, "rep", rep);
        cellReps[key] = getReplicant(rep);
        cellReps[key].on("change", () => checkButton(index));   // If adding new replicant, subscribe to changes
    }
    return cellReps[key];
}

const cellStates: (string | null)[] = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
export function getCellState(index: number) {
    return cellStates[index];
}

// const stateBuffers = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
export function checkButton(index: number) {   // Check if button state has been changed by replicant update
    if (!loupedeck || !loupedeck.replicants.display) return;

    const page = loupedeck.getCurrentPage();
    const cell = page.screen[index];
    if (!page || !cell) return redrawIfNecessary(index, null);
    loupedeck.log.info("Attempting to update", index, "for", page.display, ". Cell:", JSON.stringify(cell));

    // Evaluate updated state
    updateSubscriptions(cell, index);
    const oldState = cellStates[index];
    const state = evaluateButtonState(cell, index);
    cellStates[index] = state;
    loupedeck.log.info("State is", state);

    // If state has changed, try to redraw button to match
    if (!state) redrawIfNecessary(index, null);
    else /*if (state != oldState)*/ {
        const graphic = cell.states[state].graphic;
        redrawIfNecessary(index, graphic || null);
    }
}

function updateAll() {
    for (let i = 0; i < 15; i++) {
        checkButton(i);
    }
}

listenTo("connected", () => {
    updateAll();

    // loupedeck.replicants.display.off("change", updateAll);
    // loupedeck.replicants.display.on("change", updateAll);
})

loupedeck.replicants.display.on("change", (v, old) => { if (old) updateAll() });


function updateSubscriptions(cell: CellData, index: number) {
    // Update replicant subscriptions

    if (!cell.replicants) return;
    const cellReps = cellReplicants[index];
    // Subscribe to new replicants
    Object.entries(cell.replicants).forEach(([key, rep]) => getOrAddRep(index, key, rep));

    // Remove subscription from removed replicants
    const remove = Object.keys(cellReps).filter((key) => !(key in cell.replicants!));
    if (remove) loupedeck.log.info("Removing replicants for", index, remove);
    remove.forEach(key => delete cell.replicants![key]);
}


function evaluateButtonState(cell: CellData, index: number) {
    let elseState: string | null = null;
    let firstState: string | null = null;

    for (let [key, state] of Object.entries(cell.states)) {
        if (state.isActive) {   // Find active state
            const cellRep = cellReplicants[index];
            const active = evalCondition(state.isActive, cellRep);
            loupedeck.log.info("Evaluating", key, "result:", active);
            if (active) return key;   // Return first active state
        } else if (!elseState) {  // Find state without condition - "else" state, if no others are active
            loupedeck.log.info("Setting else state", key);
            elseState = key;
        }
        if (!firstState) firstState = key;    // Ultimate fallback
    }
    loupedeck.log.info("Using else state", elseState || firstState);
    if (elseState) return elseState;    // If no active state, return else state
    return firstState;                  // If no else state, default back to first state
}


function evalCondition(condition: Condition, cellRep: CellRep): boolean {
    // Check if all conditions within array are met
    // met = at least one value satisfies the comparison to the value at the field in the replicant
    // Effectively (repVal <op> c[0].values[0] or repVal <op> c[0].values[1] or ....) and (repVal <op> c[1].values[0] or repVal <op> c[1].values[1] or ....) and ...

    for (let cond of condition) {
        const rep = cellRep[cond.replicant];
        if (!rep) continue;
        const val = getRepValAt(rep, cond.field);

        if (cond.operator == "exists" || cond.operator == "not exists") {
            const exists = val !== undefined && val !== null;

            loupedeck.log.info("Condition", cond.operator, "val", val, "exists", exists);
            if (cond.operator == "exists" && !exists) return false;
            else if (cond.operator == "not exists" && exists) return false;
        } else {
            // Get comparison function from operator
            let match = (a: any, b: any) => a == b;
            if (cond.operator == "=") match = (a, b) => a == b;
            else if (cond.operator == "!=") match = (a, b) => a != b;
            else if (cond.operator == "<") match = (a, b) => a < b;
            else if (cond.operator == "<=") match = (a, b) => a <= b;
            else if (cond.operator == ">") match = (a, b) => a > b;
            else if (cond.operator == ">=") match = (a, b) => a >= b;

            loupedeck.log.info("Condition", cond, "val", val, "match", match, "applied", cond.values.map(condVal => match(val, condVal)))
            // Evaluate comparison against each of the values
            if (cond.values.every(condVal => !match(val, condVal))) {   // If matches none, exit
                return false;
            }
        }
    }
    // If reached this point, no conditions have been breached, so must be matched
    return true;
}


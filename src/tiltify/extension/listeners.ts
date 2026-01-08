import type NodeCG from '@nodecg/types';
import type { Donation } from 'types/schemas/tiltify';
import { getNodeCG, sendError, sendSuccess } from '../../common/utils';
import { APPROVED, CENSORED, ModStatus, UNDECIDED } from './utils/mod';
import * as rep from './utils/replicants';
import { listenTo } from '../messages';

const nodecg = getNodeCG();

function setAll<K extends keyof Donation>(prop: K, value: Donation[K], ack: NodeCG.Acknowledgement | undefined) {
    for (let i = 0; i < rep.donations.value.length; i++) {
        rep.donations.value[i][prop] = value;
    }

    sendSuccess(ack, value);
}

listenTo("clear-donations", (_, ack) => setAll("read", true, ack));
listenTo("approve-all-donations", (value, ack) => setAll("modStatus", value, ack));

function searchAndSet<K extends keyof Donation>(id: string, prop: K, value: Donation[K], ack: NodeCG.Acknowledgement | undefined): Donation | undefined {
    nodecg.log.info("Mark", prop, id, value);
    var elementIndex = rep.donations.value.findIndex((d: Donation) => d.id === id);
    if (elementIndex !== -1) {
        const elem = rep.donations.value[elementIndex];
        if (elem[prop] != value) elem[prop] = value;

        sendSuccess(ack, value);
        return elem;
    } else {
        nodecg.log.error('Donation not found to mark as read ', id);
        sendError(ack, `Donation not found to mark as read ${id}`);
        return undefined;
    }
}

listenTo("set-donation-shown", ([dono, shownVal], ack) => searchAndSet(dono.id, "shown", shownVal, ack));
listenTo("set-donation-read", ([dono, readVal], ack) => {
    const d = searchAndSet(dono.id, "read", readVal, ack);
    if (d && readVal && d.modStatus === UNDECIDED) d.modStatus = APPROVED;
});

listenTo("set-donation-modstatus", ([dono, statusVal], ack) => {
    const d = searchAndSet(dono.id, "modStatus", statusVal, ack);
    if (d && !d.shown && statusVal === APPROVED) nodecg.sendMessage("show-dono", dono);
    if (d && d.shown && statusVal !== APPROVED) nodecg.sendMessage("revoke-dono", dono);
});

import { NextFunction, Router } from 'express';
import { Request, Response } from 'express-serve-static-core';
import { createHmac } from 'node:crypto';
import { EventEmitter } from 'node:stream';
import diff from "microdiff";
import type { Campaign, Donation, Donations } from 'types/schemas/tiltify';
import NodeCG from '@nodecg/types';
import clone from 'clone';

import { getNodeCG } from '../../common/utils';
import { WEBHOOK_MODE, log } from './index.extension';
import * as rep from './utils/replicants';
import TiltifyClient from "./api-client";



const nodecg = getNodeCG();
export const tiltifyEmitter = new EventEmitter();

const client = new TiltifyClient(nodecg.bundleConfig.tiltify_client_id, nodecg.bundleConfig.tiltify_client_secret, log.info, log.error);

function pushUniqueDonation(donation: Donation) {
    const found = rep.donations.value.find(d => d.id === donation.id);
    if (found === undefined) {
        donation.read = false;
        donation.shown = false;
        donation.modStatus = null;
        tiltifyEmitter.emit("new-donation", donation);
        rep.donations.value.push(clone(donation));
    }
}

function updateTotal(campaign: Campaign) {
    // Less than check in case webhooks are sent out-of-order. Only update the total if it's higher!
    if (Number(rep.campaignTotal.value.value) < Number(campaign.amount_raised.value) || rep.campaignTotal.value.currency != campaign.amount_raised.currency) {
        rep.campaignTotal.value = campaign.amount_raised;
    }
}

async function askTiltifyForDonations() {   // Recent Donations Only
    client.Campaigns.getRecentDonations(nodecg.bundleConfig.tiltify_campaign_id!, (donations: Donations) => donations.forEach(pushUniqueDonation));
}

async function askTiltifyForTotal() {
    client.Campaigns.get(nodecg.bundleConfig.tiltify_campaign_id!, updateTotal);
}


// Function generator for generic askTiltifyFor... following
type AskFunction<T> = (id: string, callback: (data: T) => any) => any;
function askTiltifyFor<T extends any[]>(func: AskFunction<T>, rep: NodeCG.ServerReplicantWithSchemaDefault<T>) {
    return () => func(nodecg.bundleConfig.tiltify_campaign_id!, (result: T) => {     // Check different and assign
        if (rep.value?.length != result.length) {
            log.info("Setting", rep.name, "length", result.length, "old", rep.value?.length);
            rep.value = result;
        } else {
            // if (rep.value?.length != result.length || JSON.stringify(rep.value) !== JSON.stringify(result)) {
            const different = diff(rep.value, result);
            if (different.length > 0) {
                log.info("Setting", rep.name, "length", result.length, "different", different);
                rep.value = result;
            }
        }
    });
}

const askTiltifyForAllDonations = askTiltifyFor((id, cb) => client.Campaigns.getDonations(id, (donos) => {
    cb(donos);  // Standard updating of all donations list
    donos.forEach(pushUniqueDonation);  // Check none are missed in the main dono list
}), rep.allDonations);

const askTiltifyForPolls = askTiltifyFor((id, cb) => client.Campaigns.getPolls(id, cb), rep.polls);
const askTiltifyForSchedule = askTiltifyFor((id, cb) => client.Campaigns.getSchedule(id, cb), rep.schedule);
const askTiltifyForTargets = askTiltifyFor((id, cb) => client.Campaigns.getTargets(id, cb), rep.targets);
const askTiltifyForRewards = askTiltifyFor((id, cb) => client.Campaigns.getRewards(id, cb), rep.rewards);
const askTiltifyForMilestones = askTiltifyFor((id, cb) => client.Campaigns.getMilestones(id, cb), rep.milestones);
const askTiltifyForDonors = askTiltifyFor((id, cb) => client.Campaigns.getDonors(id, cb), rep.donors);


function askTiltify() {
    // Donations and total are handled by websocket normally, only ask if not using websockets
    if (!client.apiKey) return;
    askTiltifyForPolls();
    askTiltifyForTargets();
    askTiltifyForSchedule();
    askTiltifyForRewards();
    askTiltifyForMilestones();
    askTiltifyForDonors();
}


function setupWebhook() {
    const app: Router = nodecg.Router();
    const c = nodecg.bundleConfig;
    client.Webhook.activate(c.tiltify_webhook_id!, c.tiltify_webhook_secret || "", c.tiltify_tunnel || "", app, processWebhook, (d) => log.info('Webhooks staged!', d));
    nodecg.mount(app);
    const events = { "event_types": ["public:direct:fact_updated", "public:direct:donation_updated"] }
    client.Webhook.subscribe(c.tiltify_webhook_id!, c.tiltify_campaign_id!, events, (d) => log.info('Webhooks activated!', d));
}

function processWebhook(req: Request, res: Response) {
    // if (req.body.data.campaign_id !== nodecg.bundleConfig.tiltify_campaign_id) return;

    const eventType = req.body?.meta.event_type;
    if (eventType === "public:direct:donation_updated") {
        log.info("Dono recieved", req.body.data);
        pushUniqueDonation(req.body.data);
    } else if (eventType === "public:direct:fact_updated") {
        updateTotal(req.body.data);
    }
}

client.initialize().then(() => {
    if (WEBHOOK_MODE) setupWebhook();

    askTiltifyForTotal();
    askTiltifyForDonations();

    if (!WEBHOOK_MODE) {
        setInterval(() => {
            askTiltifyForTotal();
            askTiltifyForDonations();
        }, 5 * 1000);
    }

    askTiltify();
    setInterval(askTiltify, 15 * 1000);

    askTiltifyForAllDonations();
    setInterval(() => {
        client.apiKey && askTiltifyForAllDonations();
    }, 2 * 60 * 1000);
})

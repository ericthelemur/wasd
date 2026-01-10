import { WebhookStatus, WebhookLogin, Status, Login, Donations, Alldonations, Schedule, Targets, Milestones, Total, Polls, Rewards, Donors, Donation, Campaign } from "../../types/schemas/tiltify";
import { CommPoint } from "../../common/commpoint/commpoint";
import listeners, { ListenerTypes } from "../messages";
import { BundleReplicant, sendError, sendSuccess } from "../../common/utils";
import Webhook from "./api-client/lib/webhook";
import TiltifyClient from "./api-client";
import { NextFunction, Router, Request, Response } from "express";
import localtunnel from "localtunnel";
import clone from "clone";
import diff from "microdiff";
import NodeCG from "@nodecg/types";
import { WebhookCommPoint } from "./webhook";
import { APPROVED, UNDECIDED } from "./utils/mod";

const replicants = {
    status: null as null | Status,
    login: null as null | Login,

    donations: null as null | Donations,
    allDonations: null as null | Alldonations,
    campaignTotal: null as null | Total,
    polls: null as null | Polls,
    schedule: null as null | Schedule,
    targets: null as null | Targets,
    rewards: null as null | Rewards,
    milestones: null as null | Milestones,
    donors: null as null | Donors
    // login: Login,

    // donations: Donations,
    // allDonations: Alldonations,
    // campaignTotal: Total,
    // polls: Polls,
    // schedule: Schedule,
    // targets: Targets,
    // rewards: Rewards,
    // milestones: Milestones,
    // donors: Donors
}

export type NoNulls<T> = { [P in keyof T]: NonNullable<T[P]>; };
export type AllNulls<T> = { [P in keyof T]: null; };
export type Replicants = NoNulls<typeof replicants>;
const replicantNamesOnly = replicants as AllNulls<typeof replicants>;


export class Tiltify extends CommPoint<ListenerTypes, Replicants> {
    client: TiltifyClient;
    public webhook?: WebhookCommPoint;

    donoPoll?: NodeJS.Timeout;
    basicsPoll?: NodeJS.Timeout;
    allDonoPoll?: NodeJS.Timeout;

    constructor() {
        super("tiltify", replicantNamesOnly, listeners);

        this.client = new TiltifyClient(undefined, undefined, this.log.info, this.log.error);
    }

    async _connect() {
        const login = this.replicants.login.value;

        this.client.clientID = login.clientID;
        this.client.clientSecret = login.clientSecret;
        this.client.apiKey = undefined;
        this.client.initialize();
        if (!this.client.apiKey) throw new Error("Tiltify authentication failed");
    }

    pushUniqueDonation(donation: Donation) {
        // Check if dono is in list
        const donos = this.replicants.donations;
        const found = donos.value.find(d => d.id === donation.id);
        if (found) return;

        // If not, add to list and broadcast message
        donation.read = false;
        donation.shown = false;
        donation.modStatus = null;
        donos.value.push(clone(donation));
        this.listeners.sendTo("new-donation", donation);
    }

    updateTotal(campaign: Campaign) {
        if (campaign.id != this.replicants.login.value.campaignID) return;
        const newTotal = campaign.amount_raised;
        const oldTotal = this.replicants.campaignTotal.value;
        // Check if increased
        if (campaign.id != this.replicants.login.value.campaignID ||    // If changed campaign, update
            Number(oldTotal.value) < Number(newTotal.value) ||      // If increased value, update
            Number(newTotal.value) < 0.5 * Number(oldTotal.value) ||  // If decrease to < half, probably reset, so update
            oldTotal.currency != newTotal.currency) {               // If different currency, update
            this.replicants.campaignTotal.value = clone(newTotal);
        }
    }


    _updateReplicantIfDifferent<T extends any[]>(newVal: T, replicant: NodeCG.ServerReplicantWithSchemaDefault<T>) {
        const oldVal = replicant.value;
        if (oldVal.length != newVal.length) {     // Check different and assign
            this.log.debug("Setting", replicant.name, "length", newVal.length, "old", oldVal.length);
            replicant.value = newVal;
        } else {
            const different = diff(oldVal, newVal);
            if (different.length > 0) {
                this.log.debug("Setting", replicant.name, "length", newVal.length, "different", different);
                replicant.value = newVal;
            }
        }
    }

    askTiltifyFor<T extends any[]>(campaignID: string, func: (id: string, callback: (data: T) => any) => any, rep: NodeCG.ServerReplicantWithSchemaDefault<T>) {
        return () => func(campaignID, newVal => this._updateReplicantIfDifferent(newVal, rep));
    }

    async _setupListeners() {
        const campaignID = this.replicants.login.value.campaignID;
        const Campaigns = this.client?.Campaigns;
        if (!campaignID || !Campaigns || !this.client?.apiKey) return;

        const askTiltifyForDonations = () => Campaigns.getRecentDonations(campaignID, (donos) => donos.forEach(d => this.pushUniqueDonation(d)));
        const askTiltifyForTotal = () => this.client?.Campaigns.get(campaignID, c => {
            // Mark as retrying if failed poll
            if (!c) this.reconnect();

            this.updateTotal(c);
            // TODO check for auth fails???
        });

        this.donoPoll = setInterval(async () => {
            if (this.webhook && await this.webhook.isConnected()) return;
            askTiltifyForDonations();
            askTiltifyForTotal();
        }, 5 * 1000);


        // Poll campaign config fairly frequently - this mostly doesn't change
        const askTiltifyForBasic = [
            this.askTiltifyFor(campaignID, (id, cb) => Campaigns.getPolls(id, cb), this.replicants.polls),
            this.askTiltifyFor(campaignID, (id, cb) => Campaigns.getSchedule(id, cb), this.replicants.schedule),
            this.askTiltifyFor(campaignID, (id, cb) => Campaigns.getTargets(id, cb), this.replicants.targets),
            this.askTiltifyFor(campaignID, (id, cb) => Campaigns.getRewards(id, cb), this.replicants.rewards),
            this.askTiltifyFor(campaignID, (id, cb) => Campaigns.getMilestones(id, cb), this.replicants.milestones),
            this.askTiltifyFor(campaignID, (id, cb) => Campaigns.getDonors(id, cb), this.replicants.donors)
        ];
        this.basicsPoll = setInterval(() => askTiltifyForBasic.forEach(f => f()), 30 * 1000);

        // Poll full list of donos occasionally
        const askTiltifyForAllDonations = this.askTiltifyFor(campaignID, (id, cb) => Campaigns.getDonations(id, (donos) => {
            cb(donos);  // Standard updating of all donations list
            donos.forEach(d => this.pushUniqueDonation(d));  // Check none are missed in the main dono list
        }), this.replicants.allDonations);
        this.allDonoPoll = setInterval(() => askTiltifyForAllDonations(), 2 * 60 * 1000);

    }

    setAll<K extends keyof Donation>(prop: K, value: Donation[K], ack: NodeCG.Acknowledgement | undefined) {
        const donos = this.replicants.donations.value;
        for (let i = 0; i < donos.length; i++) {
            donos[i][prop] = value;
        }

        sendSuccess(ack, value);
    }


    searchAndSet<K extends keyof Donation>(id: string, prop: K, value: Donation[K], ack: NodeCG.Acknowledgement | undefined): Donation | undefined {
        this.log.info("Mark", prop, id, value);
        const donos = this.replicants.donations.value;
        const elementIndex = donos.findIndex((d: Donation) => d.id === id);
        if (elementIndex !== -1) {
            const elem = donos[elementIndex];
            if (elem[prop] != value) elem[prop] = value;

            sendSuccess(ack, value);
            return elem;
        } else {
            this.log.error('Donation not found to mark as read ', id);
            sendError(ack, `Donation not found to mark as read ${id}`);
            return undefined;
        }
    }

    createActionListeners() {
        const listenTo = this.listeners.listenTo;
        listenTo("clear-donations", (_, ack) => this.setAll("read", true, ack));
        listenTo("approve-all-donations", (value, ack) => this.setAll("modStatus", value, ack));


        listenTo("set-donation-shown", ([dono, shownVal], ack) => this.searchAndSet(dono.id, "shown", shownVal, ack));
        listenTo("set-donation-read", ([dono, readVal], ack) => {
            const d = this.searchAndSet(dono.id, "read", readVal, ack);
            if (d && readVal && d.modStatus === UNDECIDED) d.modStatus = APPROVED;
        });

        listenTo("set-donation-modstatus", ([dono, statusVal], ack) => {
            const d = this.searchAndSet(dono.id, "modStatus", statusVal, ack);
            if (d && !d.shown && statusVal === APPROVED) this.listeners.sendTo("show-dono", dono);
            if (d && d.shown && statusVal !== APPROVED) this.listeners.sendTo("revoke-dono", dono);
        });
    }


    async _disconnect() {
        clearInterval(this.donoPoll);
        this.donoPoll = undefined;

        clearInterval(this.basicsPoll);
        this.basicsPoll = undefined;

        clearInterval(this.allDonoPoll);
        this.allDonoPoll = undefined;

        this.client.apiKey = undefined;
        this.client.clientID = undefined;
        this.client.clientSecret = undefined;
    }

    async isConnected() {
        return Boolean(this.client?.apiKey) && this.replicants.status.value.connected == "connected";
    }
}
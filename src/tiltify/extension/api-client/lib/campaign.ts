import { Donations, Donors, Milestones, Polls, Rewards, Schedule, Targets } from "types/schemas/tiltify";
import type TiltifyClient from "..";
import { getNodeCG } from "../../../../common/utils";

export default class Campaign {
    parent: TiltifyClient;

    /**
     * A new campaign api object.
     * @param {object} self is `this` from index.js
     * @constructor
     */
    constructor(parent: TiltifyClient) {
        this.parent = parent;
    }

    /**
     * returns information about a campaign.
     * The total raised is in this returned object.
     * @param {string} id The campaign ID that you're looking up
     * @param {requestCallback} callback A function to call when we're done getting data
     */
    get(id: string, callback: (data: any) => any) {
        this.parent._doRequest(`public/campaigns/${id}`).then(data => data && callback(data));
    }

    /**
     * returns the most recent page of donations.
     * Use this if polling for new donations.
     * @param {string} id The campaign ID that you're looking up
     * @param {requestCallback} callback A function to call when we're done getting data
     */
    getRecentDonations(id: string, callback: (data: Donations) => any) {
        this.parent._doRequest<Donations>(`public/campaigns/${id}/donations`).then(data => data && callback(data));
    }

    /**
     * returns ALL donations from a campaign.
     * @param {string} id The campaign ID that you're looking up
     * @param {requestCallback} callback A function to call when we're done getting data
     */
    getDonations(id: string, callback: (data: Donations) => any) {
        this.parent._sendRequest<Donations>(`public/campaigns/${id}/donations?limit=100`, callback);
    }

    /**
     * returns all donation matching offers from a campaign
     * @param {string} id The campaign ID that you're looking up
     * @param {requestCallback} callback A function to call when we're done getting data
     */
    getDonationMatches(id: string, callback: (data: any) => any) {
        this.parent._sendRequest(`public/campaigns/${id}/donation_matches?limit=100`, callback);
    }

    /**
     * returns all rewards for a campaign
     * @param {string} id The campaign ID that you're looking up
     * @param {requestCallback} callback A function to call when we're done getting data
     */
    getRewards(id: string, callback: (data: Rewards) => any) {
        this.parent._sendRequest(`public/campaigns/${id}/rewards?limit=100`, callback);
    }

    /**
     * returns all polls for a campaign
     * @param {string} id The campaign ID that you're looking up
     * @param {requestCallback} callback A function to call when we're done getting data
     */
    getPolls(id: string, callback: (data: Polls) => any) {
        this.parent._sendRequest(`public/campaigns/${id}/polls?limit=100`, callback);
    }

    /**
     * returns all targets for a campaign
     * @param {string} id The campaign ID that you're looking up
     * @param {requestCallback} callback A function to call when we're done getting data
     */
    getTargets(id: string, callback: (data: Targets) => any) {
        this.parent._sendRequest(`public/campaigns/${id}/targets?limit=100`, callback);
    }

    /**
     * returns all polls for a campaign
     * @param {string} id The campaign ID that you're looking up
     * @param {requestCallback} callback A function to call when we're done getting data
     */
    getMilestones(id: string, callback: (data: Milestones) => any) {
        this.parent._sendRequest(`public/campaigns/${id}/milestones?limit=100`, callback);
    }

    /**
     * returns the schedule of a campaign
     * @param {string} id The campaign ID that you're looking up
     * @param {requestCallback} callback A function to call when we're done getting data
     */
    getSchedule(id: string, callback: (data: Schedule) => any) {
        this.parent._sendRequest(`public/campaigns/${id}/schedules?limit=100`, callback);
    }

    /**
     * returns the donors of a campaign
     * @param {string} id The campaign ID that you're looking up
     * @param {requestCallback} callback A function to call when we're done getting data
     */
    getDonors(id: string, callback: (data: Donors) => any) {
        this.parent._sendRequest(`public/campaigns/${id}/donor_leaderboard?limit=100`, callback);
    }
}
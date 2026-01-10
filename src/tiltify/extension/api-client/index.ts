import axios, { AxiosError, AxiosRequestConfig } from "axios";
import type { Router } from 'express';
import type { Request, Response } from 'express-serve-static-core';

import Campaign from "./lib/campaign";
import Webhook from "./lib/webhook";


type TiltifyResponse<T> = { data: T, metadata: { after: string } };

export default class TiltifyClient {
    clientID?: string;
    clientSecret?: string;
    keyTimeout?: NodeJS.Timeout;
    apiKey?: string;
    refreshToken?: string;

    info: (...args: any[]) => void;
    error: (...args: any[]) => void;

    apiUrl = "https://v5api.tiltify.com/api";
    oauthUrl = "https://v5api.tiltify.com/oauth/token";

    public Campaigns: Campaign;
    public Webhook: Webhook;

    /**
     * A TiltifyClient contains all of the sub-types that exist on the Tiltify API
     * @param {string} clientID The Client ID that you got from Tiltify.
     * @param {string} clientSecret The Client Secret that you got from Tiltify.
     * @constructor
     */
    constructor(clientID: string | undefined, clientSecret: string | undefined, info: (...args: any[]) => void = console.log, error: (...args: any[]) => void = console.error) {
        this.clientID = clientID;
        this.clientSecret = clientSecret;
        this.info = info;
        this.error = error;
        this.Campaigns = new Campaign(this);
        // this.TeamCampaigns = new TeamCampaign(this);
        // this.Causes = new Cause(this);
        // this.FundraisingEvents = new FundraisingEvents(this);
        // this.Team = new Team(this);
        // this.User = new User(this);
        this.Webhook = new Webhook(this);
    }

    /**
     * Generate access key and fully initialize the client
     */
    async initialize() {
        await this.generateKey().catch(e => {
            this.error("Error authenticating with Tiltify");
        })
    }

    /**
     * Set the API key manually, this also disables the refresh checker.
     * Primarily used for testing
     * @param {string} key API key
     */
    setKey(key: string) {
        this.apiKey = key;
        clearTimeout(this.keyTimeout);
    }

    // scheduleRetry(attempt: number = 0) {
    //     // Schedule renew job to try again, recursively call this function
    //     clearTimeout(this.keyTimeout);
    //     this.keyTimeout = setTimeout(() => this.generateKey(attempt + 1).catch(() => { }), 5000 * attempt);
    // }

    /**
     * Generate an access token to call the api, recursively calls itself when regenerating keys
     * @param {int} attempt Attempt counter, for spacing out retries
     */
    async generateKey(attempt = 1) {
        this.info("Gen Key", Boolean(this.refreshToken), new Date());
        const tail = this.refreshToken ? `grant_type=refresh_token&refresh_token=${this.refreshToken}` : "grant_type=client_credentials&scope=public webhooks:write";
        const url = `${this.oauthUrl}?client_id=${this.clientID}&client_secret=${this.clientSecret}&${tail}`;
        try {
            this.info(url);
            const payload = await axios({ url, method: 'POST' }).catch(e => { /*this.scheduleRetry();*/ throw e })
            this.info(payload.status);
            this.info(payload.data);
            if (payload.status === 200 && payload.data && payload.data.expires_in) {
                this.apiKey = payload.data.access_token;
                this.refreshToken = payload.data.refresh_token;
                this.info("Set key", this.apiKey);

                // Schedule renew job
                clearTimeout(this.keyTimeout);
                this.keyTimeout = setTimeout(() => this.generateKey(), (payload.data?.expires_in || 5) * 1000 / 2 - 100);    // Wait half time only for safety

                return this.apiKey;
            } else {
                console.warn("Tiltify authentication failed");
                clearTimeout(this.keyTimeout);
                this.apiKey = undefined;
                // this.scheduleRetry(attempt);
            }
        } catch (error) {
            return Promise.reject(error)
        }
    }

    private convertToURL(path: string) {
        return new URL("./" + path, this.apiUrl + (this.apiUrl.endsWith("/") ? "" : "/"));
    }

    private async _processRequest<T>(path: string | URL, method: string = 'GET', payload?: Object) {
        if (!this.apiKey) {
            this.error('Client has not been initalized or apiKey is missing');
            return null;
        }

        let url = path;
        if (typeof path == "string") url = this.convertToURL(path);

        const options: AxiosRequestConfig<string | undefined> = {
            url: String(url),
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            method
        }

        if (payload) options.data = JSON.stringify(payload);

        return await axios<TiltifyResponse<T>>(options).catch((e) => {
            this.errorParse(e, `Error sending request to ${String(url)}:`)
        });
    }

    /**
     * _doRequest does a single request and returns the response.
     * Normally this is wrapped in _sendRequest, but for some
     * endpoints like Campaigns.getRecentDonations(id) need to send
     * only a single request. This function is not actually called in
     * the TiltifyClient, and is passed down to each of the types.
     * @param {string | URL} path The API call path without /api/ if string, or full request path if URL object.
     * @param {string} method HTTP method to make calls with, default to GET
     * @param {Object} payload JSON payload to send
     */
    async _doRequest<T>(path: string | URL, method: string = 'GET', payload?: Object) {
        return this._processRequest<T>(path, method, payload).then(r => r && r.status == 200 ? r.data.data : null);
    }

    /**
     * _sendRequest is used for all endpoints, but only has a recursive
     * effect when called againt an endpoint that contains a `metadata.after` string
     * @param {string} path The path, without /api/public/
     * @param {function} callback A function to call when we're done processing.
     */
    async _sendRequest<T>(path: string, callback: any) {
        const url = this.convertToURL(path);
        try {
            let results: T[] = [];
            while (true) {
                const resp = await this._processRequest<T[]>(url);
                if (!resp || resp.status != 200) return;

                const data = resp.data.data;
                if (data) {
                    results = results.concat(data);

                    if (resp.data.metadata && resp.data.metadata.after) {
                        url.searchParams.set('after', resp.data.metadata.after); // Paginatewith metadata.after
                        continue;
                    }
                }
                callback(results);
                break;
            }
        } catch (e) {
            this.errorParse(e as any, `Error sending request to ${path}`);
        }
    }

    errorParse(e: Error | AxiosError, msg?: string) {
        if (msg) this.error(msg);

        if (e === undefined) this.error(e);
        else if ("response" in e) this.error(e.response?.status, e.response?.statusText);
        else if (e.cause) this.error(e.cause);
        else if (e.message) this.error(e.message);
        else this.error(e);
        // console.debug(e);
    }
}
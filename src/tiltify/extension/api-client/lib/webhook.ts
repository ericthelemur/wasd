import { NextFunction, Router } from 'express';
import { Request, Response } from 'express-serve-static-core';
import { createHmac } from 'node:crypto';

import type TiltifyClient from "..";


export default class Webhook {
    parent: TiltifyClient;
    secret: string | undefined;
    /**
     * A new webhook api object.
     * @param {object} parent is `this` from index.js
     * @constructor
     */
    constructor(parent: TiltifyClient) {
        this.parent = parent;
    }

    /**
     * activates a webhook endpoint
     * @param {string} id the webhook id to look up
     * @param {requestCallback} callback a function to call when we're done getting data
     */
    activate(id: string, secret: string, app: Router, processWebhook: (req: Request, res: Response) => any, callback: (data: any) => any) {
        this.secret = secret;

        // Open endpoint
        app.post('/tiltify/webhook', this.validateSignature.bind(this), (req: Request, res: Response) => {
            processWebhook(req, res);
            res.sendStatus(200);
        })

        this.parent._doRequest(`private/webhook_endpoints/${id}/activate`, 'POST').then(data => data && callback(data));
    }

    /**
     * creates or updates a webhook subscription
     * @param {string} webhookID id of the webhook
     * @param {string} eventID id of the event (campaign, team campaign, fundraising event) to track
     * @param {Object} payload JSON array {event_types: [<TYPES>]} of events to subscribe to (see Tiltify API ref)
     * @param {requestCallback} callback a function to call when we're done getting data
     */
    subscribe(webhookID: string, eventID: string, payload: Object, callback: (data: any) => any) {
        this.parent._doRequest(`private/webhook_endpoints/${webhookID}/webhook_subscriptions/${eventID}`, 'PUT', payload).then(data => data && callback(data));
    }

    /**
     * list relay keys by webhook id
     * @param {string} id the webhook id to look up
     * @param {requestCallback} callback a function to call when we're done getting data
     */
    listRelays(id: string, callback: (data: any) => any) {
        this.parent._sendRequest(`private/webhook_relays/${id}/webhook_relay_keys`, callback)
    }

    /**
     * create a new webhook relay key
     * @param {string} id webhook relay id
     * @param {Object} payload optional payload to send, json with id and metadata
     * @param {requestCallback} callback a function to call when we're done getting data
     */
    createRelay(id: string, payload: Object, callback: (data: any) => any) {
        this.parent._doRequest(`private/webhook_relays/${id}/webhook_relay_keys`, 'POST', payload).then(data => data && callback(data));
    }

    /**
     * return webhook relay key by id
     * @param {string} webhookRelayID webhook relay id
     * @param {string} webhookRelayKeyID webhook relay key id
     */
    getRelayKey(webhookRelayID: string, webhookRelayKeyID: string, callback: (data: any) => any) {
        this.parent._doRequest(`private/webhook_relays/${webhookRelayID}/webhook_relay_keys/${webhookRelayKeyID}`).then(data => data && callback(data));
    }


    /**
     * Verifies that the payload delivered matches the signature provided, using sha256 algorithm and the webhook secret
     * Acts as middleware, use in route chain
     */
    validateSignature(req: Request, res: Response, next: NextFunction) {
        const signatureIn = req.get('X-Tiltify-Signature');
        const timestamp = req.get('X-Tiltify-Timestamp');
        const signedPayload = `${timestamp}.${JSON.stringify(req.body)}`;
        const hmac = createHmac('sha256', this.secret as string);
        hmac.update(signedPayload);
        const signature = hmac.digest('base64');
        if (signatureIn === signature) {
            next();
        } else {
            // Close connection (200 code MUST be sent regardless)
            res.sendStatus(200);
        };
    }
}
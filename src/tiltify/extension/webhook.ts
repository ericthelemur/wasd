import { WebhookStatus, WebhookLogin } from "../../types/schemas/tiltify";
import { CommPoint } from "../../common/commpoint/commpoint";
import { webhookListeners, WebhookListenerTypes } from "../messages";
import { BundleReplicant } from "../../common/utils";
import Webhook from "./api-client/lib/webhook";
import TiltifyClient from "./api-client";
import { NextFunction, Router, Request, Response } from "express";
import localtunnel from "localtunnel";
import { Tiltify } from "./tiltify";

export type WebhookReplicants = {
    status: WebhookStatus,
    login: WebhookLogin
}

export class WebhookCommPoint extends CommPoint<WebhookListenerTypes, WebhookReplicants> {
    client: TiltifyClient;
    tunnel?: localtunnel.Tunnel;

    tiltify?: Tiltify;
    connectedID: string | null = null;
    connectedCampaign: string | null = null;

    constructor(tiltify: Tiltify, client: TiltifyClient) {
        super("tiltify-webhook", { status: BundleReplicant("webhookstatus", "tiltify"), login: BundleReplicant("webhooklogin", "tiltify") }, webhookListeners);

        this.tiltify = tiltify;
        tiltify.webhook = this;
        this.client = client;

        // Create recieving endpoint for webhook
        const app: Router = this.nodecg.Router();
        app.post('/tiltify/webhook', client.Webhook.validateSignature.bind(client.Webhook), (req: Request, res: Response) => {
            this.processWebhook(req, res);
        });
        app.post('/tiltify/test', (req: Request, res: Response) => { res.sendStatus(200) });
        this.nodecg.mount(app);
    }

    processWebhook(req: Request, res: Response) {
        // if (req.body.data.campaign_id !== nodecg.bundleConfig.tiltify_campaign_id) return;

        const eventType = req.body?.meta.event_type;
        if (eventType === "public:direct:donation_updated") {
            this.log.info("Dono recieved", req.body.data);
            this.tiltify?.pushUniqueDonation(req.body.data);
        } else if (eventType === "public:direct:fact_updated") {
            this.tiltify?.updateTotal(req.body.data);
        }
    }


    override async _connect() {
        const login = this.replicants.login.value;
        if (!login.webhookID || !login.webhookSecret || !this.connectedCampaign) this.log.error("Webhook ID or Secret is empty. Please define them to connect to the webhook");
        else {
            // Activate then subscribe to webhook
            this.client.Webhook.activate(login.webhookID, login.webhookSecret, d => this.log.info("Webhook created", d));
            const events = { "event_types": ["public:direct:fact_updated", "public:direct:donation_updated"] };
            this.client.Webhook.subscribe(login.webhookID, this.connectedCampaign /* TEMPORARY */, events, d => this.log.info('Subscribed to webhook', d));

            this.connectedID = login.webhookID;
            this.connectedCampaign = this.connectedCampaign;
            if (login.targetSubdomain) this.createTunnel(login.targetSubdomain);
        }
    }

    /**
     * Create tunnel using https://localtunnel.me/ - this exposes the webhook for tiltify 
     * without extra configuration or installation. Subdomain passed in is a target, check message for result
     * @param subdomain Target subdomain to assign. If it is currently in use elsewhere, localtunnel will assign random one
     */
    createTunnel(subdomain: string) {
        this.log.info("Creating Webhook Tunnel with Localtunnel...");
        localtunnel({ port: 9090, subdomain }).then(t => {
            this.log.info(`Tiltify webhook tunnel created for ${t.url}/tiltify/webhook`);
            const expected = `https://${subdomain}.loca.lt`;
            if (t.url != expected) {    // Check webhook url matches expectation
                this.log.error("Webhook tunnel url is unexpected. Expected:", expected, "Actual:", t.url, ". If expected, update webhook URL on tiltify. If not, check nothing else is using the subdomain and restart");
            }
            this.replicants.status.value.url = t.url;

            t.on("request", data => console.log("Webhook message", data));
            t.on("close", () => this.reconnect());

        }).catch((e) => console.error("Failed to create tunnel", e));
    }

    override async _setupListeners() {
        // Poll test endpoint
        setInterval(async () => {
            const status = this.replicants.status.value;
            if (!status.url || !this.isConnected()) return;
            await fetch(new URL("tiltify/test", status.url), { method: "POST" }).then(r => {
                if (!r.ok) {
                    this.log.error("Tunnel failed poll, reconnecting...");
                    this.reconnect()
                };
            }).catch(e => {
                this.log.error("Tunnel failed poll, reconnecting...");
                this.reconnect()
            });
        }, 5 * 1000);
    }

    override async isConnected() {
        return this.replicants.status.value.connected == "connected";
    }

    override async _disconnect() {
        if (this.tunnel) {  // Try to close tunnel if exists
            this.log.error("Closing Tunnel");
            try {
                this.tunnel.close();
            } catch (e) {
                this.log.error("Error closing tunnel", e);
            }
        }

        // Try to delete registration if exists
        if (this.connectedID && this.connectedCampaign) {
            this.client.Webhook.delete(this.connectedID, this.connectedCampaign, d => this.log.error("Disconnected from webhook", d));
        }
    }
}
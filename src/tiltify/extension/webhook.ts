import { Request, Response, Router } from "express";
import localtunnel from "localtunnel";
import { CommPoint } from "../../common/commpoint/commpoint";
import { buildSchemaPath, BundleReplicant } from "../../common/utils";
import { WebhookLogin, WebhookStatus } from "../../types/schemas/tiltify";
import { webhookListeners, WebhookListenerTypes } from "../messages";
import TiltifyClient from "./api-client";
import { Tiltify } from "./tiltify";

export type WebhookReplicants = {
    status: WebhookStatus,
    login: WebhookLogin
}

export class WebhookCommPoint extends CommPoint<WebhookListenerTypes, WebhookReplicants> {
    client: TiltifyClient;
    tunnel?: localtunnel.Tunnel;

    tiltify?: Tiltify;

    connectionPoll?: NodeJS.Timeout;

    constructor(tiltify: Tiltify, client: TiltifyClient) {
        super("tiltify-webhook", {
            status: BundleReplicant("status", "tiltify-webhook", { schemaPath: buildSchemaPath("tiltify", "webhookStatus") }),
            login: BundleReplicant("login", "tiltify-webhook", { schemaPath: buildSchemaPath("tiltify", "webhookLogin") }),
        }, webhookListeners);

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
        if (!login.webhookID || !login.webhookSecret) throw new Error("Webhook ID or Secret is empty");
        if (!(await this.tiltify?.isConnected())) throw new Error("Connect Tiltify before connecting the webhook");
        const campaignID = this.tiltify?.replicants.login.value.campaignID;
        if (!campaignID) throw new Error("No Campaign ID Assigned");

        this.replicants.status.value.url = null;

        // Save secret to authenticate incoming messages
        this.client.Webhook.secret = login.webhookSecret;

        // Activate webhook
        const activateData = await this.client._doRequest(`private/webhook_endpoints/${login.webhookID}/activate`, 'POST');
        if (!activateData) throw new Error("Activating Webhook Failed");

        // Subscribe to campaign updates (for total) and new donations
        const events = { "event_types": ["public:direct:fact_updated", "public:direct:donation_updated"] };
        const subscribeData = this.client._doRequest(`private/webhook_endpoints/${login.webhookID}/webhook_subscriptions/${campaignID}`, 'PUT', events);
        if (!subscribeData) throw new Error("Subscribing to Webhook Failed");

        // If tunneling, create tunnel
        if (login.targetSubdomain) this.createTunnel(login.targetSubdomain);
    }

    /**
     * Create tunnel using https://localtunnel.me/ - this exposes the webhook for tiltify 
     * without extra configuration or installation. Subdomain passed in is a target, check message for result
     * @param subdomain Target subdomain to assign. If it is currently in use elsewhere, localtunnel will assign random one
     */
    createTunnel(subdomain: string) {
        this.log.info("Creating webhook tunnel with localtunnel...");
        localtunnel({ port: 9090, subdomain }).then(t => {
            this.tunnel = t;
            this.log.info(`Tiltify webhook tunnel created for ${t.url}/tiltify/webhook`);
            const expected = `https://${subdomain}.loca.lt`;
            if (t.url != expected) {    // Check webhook url matches expectation
                this.log.error("Webhook tunnel url is unexpected. Expected:", expected, "Actual:", t.url, ". If expected, update webhook URL on tiltify. If not, check nothing else is using the subdomain and restart. If happens repeatedly, use Cloudflare Tunnel instead");
            }
            this.replicants.status.value.url = t.url;

            t.on("request", data => data.path != "/tiltify/test" && this.log.info("Webhook message", data));
            t.on("close", () => { this.log.warn("Tunnel closed"); setTimeout(() => this.createTunnel(subdomain), 1000) });

        }).catch((e) => this.log.error("Failed to create tunnel", e));
    }

    override async _setupListeners() {
        // Poll test endpoint
        const login = this.replicants.login.value;
        if (!login.targetSubdomain) return;

        this.connectionPoll = setInterval(async () => {
            const status = this.replicants.status.value;
            if (!status.url || !await this.isConnected()) return;
            await fetch(new URL("tiltify/test", status.url), { method: "POST", signal: AbortSignal.timeout(5 * 1000) }).then(async r => {
                if (!r.ok && await this.isConnected()) {
                    this.log.error("Tunnel failed poll, reconnecting...");
                    this.reconnect();
                };
            }).catch(async e => {
                if (await this.isConnected()) {
                    this.log.error("Tunnel failed poll, reconnecting...", e);
                    this.reconnect();
                }
            });
        }, 10 * 1000);
    }

    override async isConnected() {
        return this.replicants.status.value.connected == "connected";
    }

    override async _disconnect() {
        clearInterval(this.connectionPoll);
        this.connectionPoll = undefined;

        if (this.tunnel) {  // Try to close tunnel if exists
            this.log.warn("Closing Tunnel");
            try {
                this.tunnel.close();
                this.tunnel = undefined;
            } catch (e) {
                this.log.error("Error closing tunnel", e);
            }
        }

        // Try to delete registration if exists
        const webhookID = this.replicants.login.value.webhookID;
        const campaignID = this.tiltify?.replicants.login.value.campaignID;
        if (webhookID && campaignID && await this.isConnected()) {
            this.client.Webhook.delete(webhookID, campaignID, d => this.log.info("Disconnected from webhook", d));
        }
    }
}
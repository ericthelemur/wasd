import { Tiltify } from "./tiltify";
import { WebhookCommPoint } from "./webhook";

export const tiltify = new Tiltify();
export const webhook = new WebhookCommPoint(tiltify, tiltify.client);

import { Donation } from '../types/schemas';
import { createMessageListenersBundle } from '../common/messages';
import { Login } from '../types/schemas/loupedeck';
import { ModStatus } from './extension/utils/mod';

export type ListenerTypes = {
    "connect": Partial<Login>,
    "disconnect": undefined,
    "connected": undefined,

    "new-donation": Donation,
    "show-dono": Donation | { id: string },
    "revoke-dono": Donation | { id: string },

    "clear-donations": undefined,
    "approve-all-donations": ModStatus,
    "set-donation-read": [Donation | { id: string }, boolean],
    "set-donation-shown": [Donation | { id: string }, boolean],
    "set-donation-modstatus": [Donation | { id: string }, ModStatus],
}

const listeners = createMessageListenersBundle<ListenerTypes>("tiltify");
export default listeners;
export const { listenTo, sendTo, sendToF } = listeners;


export type WebhookListenerTypes = {
    "connect": Partial<Login>,
    "disconnect": undefined,
    "connected": undefined
}

export const webhookListeners = createMessageListenersBundle<WebhookListenerTypes>("tiltify-webhook");
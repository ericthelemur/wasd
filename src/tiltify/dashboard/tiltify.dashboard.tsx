import '../../common/uwcs-bootstrap.css';

import { createRoot } from 'react-dom/client';

import { CreateCommPointConnect } from '../../common/commpoint/login';
import listeners, { webhookListeners } from '../messages';
import type { Replicants } from '../extension/tiltify';
import { WebhookReplicants } from 'tiltify/extension/webhook';

const root = createRoot(document.getElementById('root')!);

const ControlForm = CreateCommPointConnect("tiltify", listeners, {
    clientID: "Client ID",
    clientSecret: "Client Secret",
    campaignID: "Campaign ID"
} as const, {}, { connected: "disconnected" }, ({ status }: { status: Replicants["status"] }) => <>
    <div>Campaign Name: {status.campaignName}</div>
</>);

const WebhookControlForm = CreateCommPointConnect("tiltify-webhook", webhookListeners, {
    webhookID: "Webhook ID",
    webhookSecret: "Webhook Secret",
    targetSubdomain: "Requested Subdomain"
} as const, {}, { connected: "disconnected", url: null }, ({ status }: { status: WebhookReplicants["status"] }) => <>
    {status.connected == "connected" && <div>URL: {status.url}</div>}
</>);

root.render(<>
    <ControlForm />
    <WebhookControlForm />
</>);

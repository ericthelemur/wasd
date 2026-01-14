import '../../common/uwcs-bootstrap.css';

import { createRoot } from 'react-dom/client';

import { CreateCommPointConnect } from '../../common/commpoint/login';
import listeners, { webhookListeners } from '../messages';
import type { Replicants } from '../extension/tiltify';
import { WebhookReplicants } from 'tiltify/extension/webhook';
import { useReplicant } from 'use-nodecg';
import { WebhookLogin } from 'types/schemas/tiltify';

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
    webhookSecret: "Webhook Signing ID",
    targetSubdomain: "Requested Subdomain"
} as const, {}, { connected: "disconnected", url: null }, function ({ status }: { status: WebhookReplicants["status"] }) {
    const [login,] = useReplicant<WebhookLogin>("login", {}, { namespace: "mixer" });
    return <>{status.connected == "connected" && login?.targetSubdomain &&
        <div className={status.url?.includes(login.targetSubdomain) ? "" : "text-danger"}>URL: {status.url || "Not Automatically Tunnelled"}</div>
    }</>;
});

root.render(<>
    <ControlForm />
    <WebhookControlForm />
</>);

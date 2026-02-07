import '../../common/uwcs-bootstrap.css';

import { createRoot } from 'react-dom/client';

import { CreateCommPointConnect } from '../../common/commpoint/login';
import listeners, { webhookListeners } from '../messages';
import type { Replicants } from '../extension/tiltify';
import { WebhookReplicants } from 'tiltify/extension/webhook';
import { useReplicant } from 'use-nodecg';
import { WebhookLogin, WebhookStatus } from 'types/schemas/tiltify';
import Form from 'react-bootstrap/Form';

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
    targetSubdomain: "Requested Subdomain (Optional, leave empty to not tunnel)"
} as const, {}, { connected: "disconnected", url: null }, function ({ status }: { status: WebhookReplicants["status"] }) {
    const [login,] = useReplicant<WebhookLogin>("login", {}, { namespace: "tiltify-webhook" });
    return <>{status.connected == "connected" && login?.targetSubdomain &&
        <div className={status.url?.includes(login.targetSubdomain) ? "" : "text-danger"}>URL: {status.url || "Not Automatically Tunnelled"}</div>
    }</>;
});

function WebhookEnableDisable() {
    const [login, setLogin] = useReplicant<WebhookLogin>("login", {}, { namespace: "tiltify-webhook" });
    const [status,] = useReplicant<WebhookStatus>("status", { "connected": "disconnected", "url": "" }, { namespace: "tiltify-webhook" });
    if (!login || !status) return;

    function toggle() {
        setLogin({ ...login, disabled: !(login?.disabled) });
        if (status?.connected) webhookListeners.sendTo("disconnect");
    }

    return <>
        <Form.Switch className="m-3" label="Use Webhook" checked={!login.disabled} onClick={toggle} />
        {!login.disabled && <WebhookControlForm />}
    </>
}

root.render(<>
    <ControlForm />
    <WebhookEnableDisable />
</>);

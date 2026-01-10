import '../../common/uwcs-bootstrap.css';

import { createRoot } from 'react-dom/client';

import { CreateCommPointConnect } from '../../common/commpoint/login';
import listeners, { } from '../messages';
import type { Replicants } from '../extension/tiltify';

const root = createRoot(document.getElementById('root')!);

const ControlForm = CreateCommPointConnect("tiltify", listeners, {
    clientID: "Client ID",
    clientSecret: "Client Secret",
    campaignID: "Campaign ID"
} as const, {}, { connected: "disconnected" }, ({ status }: { status: Replicants["status"] }) => <>
    <div>Campaign Name: {status.campaignName}</div>
</>);

root.render(<ControlForm />);

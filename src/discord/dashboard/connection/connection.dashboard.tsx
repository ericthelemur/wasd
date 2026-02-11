import { createRoot } from 'react-dom/client';
import '../../../common/uwcs-bootstrap.css';

import { CreateCommPointConnect } from '../../../common/commpoint/login';
import type { Replicants } from "../../extension/discord";
import listeners, { ListenerTypes } from '../../messages';


const ControlForm = CreateCommPointConnect<ListenerTypes, Replicants>("discord", listeners, {
	appID: "Discord App ID",
	token: "Discord Bot Token",
	server: "Discord Server",
	scheduleChannel: "Schedule Channel",
	donationChannel: "Donations Channel",
} as const, { appID: "", token: "", server: "" }, { connected: "disconnected" });

const root = createRoot(document.getElementById('root')!);
root.render(<ControlForm />);

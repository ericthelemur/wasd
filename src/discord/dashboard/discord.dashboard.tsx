import { createRoot } from 'react-dom/client';
import '../../common/uwcs-bootstrap.css';

import Form from "react-bootstrap/Form";
import { CreateCommPointConnect } from '../../common/commpoint/login';
import type { Replicants } from "../extension/discord";
import listeners, { ListenerTypes } from '../messages';

function DiscordControl() {
	return <div className="m-3">
		<Form>
			<Form.Check type="switch" label="Schedule Messages" />
			<Form.Check type="switch" label="Donation Messages" />
		</Form>
	</div>
}

const ControlForm = CreateCommPointConnect<ListenerTypes, Replicants>("discord", listeners, {
	appID: "Discord App ID",
	token: "Discord Bot Token",
	server: "Discord Server",
	scheduleChannel: "Schedule Channel",
	donationChannel: "Donations Channel",
} as const, { appID: "", token: "", server: "" }, { connected: "disconnected" }, DiscordControl);

const root = createRoot(document.getElementById('root')!);
root.render(<ControlForm />);

import { createRoot } from 'react-dom/client';
import '../../common/uwcs-bootstrap.css';

import Form from "react-bootstrap/Form";
import { CreateCommPointConnect } from '../../common/commpoint/login';
import type { Replicants } from "../extension/discord";
import listeners, { ListenerTypes, sendToF } from '../messages';
import { useReplicant } from 'use-nodecg';
import { Status } from 'types/schemas/discord';
import { useRef } from 'react';
import { Button } from 'react-bootstrap';

function DiscordControl() {
	const [status, setStatus] = useReplicant<Status>("status", { "connected": "connected" }, { "namespace": "discord" });
	if (!status) return <></>;

	return <div className="m-3">
		<Form>
			<Form.Check type="switch" label="Schedule Messages" checked={status?.postSchedule} onClick={e => setStatus({ ...status, postSchedule: !status.postSchedule })} />
			<Form.Check type="switch" label="Start & End Events" checked={status?.startAndEndEvents} onClick={e => setStatus({ ...status, startAndEndEvents: !status.startAndEndEvents })} />
			{/* <Form.Check type="switch" label="Donation Messages" checked={status?.postDonations} onClick={e => setStatus({ ...status, postDonations: !status.postDonations })} /> */}
			<Button onClick={sendToF("updateEvents", undefined)}>Update Discord Events</Button>
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

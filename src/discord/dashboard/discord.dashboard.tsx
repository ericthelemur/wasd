import { createRoot } from 'react-dom/client';
import '../../common/uwcs-bootstrap.css';

import Form from "react-bootstrap/Form";
import { CreateCommPointConnect } from '../../common/commpoint/login';
import type { Replicants } from "../extension/discord";
import listeners, { ListenerTypes, listenTo, sendTo, sendToF, unlistenTo } from '../messages';
import { useReplicant } from 'use-nodecg';
import { Status } from 'types/schemas/discord';
import { SetStateAction, useEffect, useRef, useState } from 'react';
import { Button, ButtonGroup, FloatingLabel } from 'react-bootstrap';
import { Send } from 'react-bootstrap-icons';
import { MessageCreateOptions } from 'discord.js';

function DiscordControl() {
	const [status, setStatus] = useReplicant<Status>("status", { "connected": "connected" }, { "namespace": "discord" });
	const [msg, setMsg] = useState<null | { isJSON: boolean, channelID: string, channelName?: string, runID?: string }>(null);
	const msgRef = useRef<HTMLTextAreaElement>(null);
	if (!status) return <></>;

	// Recieve previewMessage and display preview
	useEffect(() => {
		const listener = (data: ListenerTypes["previewMessage"]) => {
			let newMsg = { isJSON: false, channelID: data.channelID, channelName: data.channelName, runID: data.runID };
			let text = data.content;
			if (typeof text != "string") {
				text = JSON.stringify(text);
				newMsg.isJSON = true;
			}
			setMsg(newMsg);
			if (msgRef.current) msgRef.current.value = text;
		}
		listenTo("previewMessage", listener);
		return () => unlistenTo("previewMessage", listener);
	}, []);

	async function post() {
		let content = msgRef.current?.value;
		if (!msg || !msgRef.current || !content) return;
		msgRef.current.value = "";

		let parsed: string | MessageCreateOptions = content;
		if (msg.isJSON) parsed = JSON.parse(content) as MessageCreateOptions;

		const data = { channelID: msg.channelID, content: content, runID: msg.runID };
		console.log(await sendTo("postMessage", data));
		setMsg({ channelID: msg.channelID, isJSON: false, channelName: msg.channelName });
	}

	return <div className="m-3">
		<Form>
			<Form.Check type="switch" label="Schedule Messages" checked={status?.postSchedule} onClick={e => setStatus({ ...status, postSchedule: !status.postSchedule })} />
			<Form.Check type="switch" label="Start & End Events" checked={status?.startAndEndEvents} onClick={e => setStatus({ ...status, startAndEndEvents: !status.startAndEndEvents })} />
			<Button onClick={sendToF("updateEvents", undefined)}>Update Discord Events</Button>

			{/* <Form.Check type="switch" label="Donation Messages" checked={status?.postDonations} onClick={e => setStatus({ ...status, postDonations: !status.postDonations })} /> */}
			<Form.Group className="my-3">
				<FloatingLabel label="Schedule Message Preview">
					<Form.Control as="textarea" ref={msgRef} onSubmit={post} />
				</FloatingLabel>
				<Button className="flex-grow-1" disabled={!msg || !msg.channelID} variant={msg && msg.runID ? "danger" : "outline-primary"} onClick={post}>
					<Send /> Send Message{msg && msg.channelName ? ` to #${msg.channelName}` : ""}
				</Button>
			</Form.Group>
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

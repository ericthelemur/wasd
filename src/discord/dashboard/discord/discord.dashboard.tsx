import '../../../common/uwcs-bootstrap.css';

import { MessageCreateOptions } from 'discord.js';
import { SetStateAction, useEffect, useRef, useState } from 'react';
import { Button, ButtonGroup, FloatingLabel, InputGroup } from 'react-bootstrap';
import { Ban, Send, TrashFill } from 'react-bootstrap-icons';
import Form from 'react-bootstrap/Form';
import { createRoot } from 'react-dom/client';
import { Login, Status } from 'types/schemas/discord';
import { useReplicant } from 'use-nodecg';

import { CommPointStatus, CreateCommPointConnect } from '../../../common/commpoint/login';
import listeners, { ListenerTypes, listenTo, sendTo, sendToF, unlistenTo } from '../../messages';

import type { Replicants } from "../../extension/discord";
function DiscordControl() {
	const [status, setStatus] = useReplicant<Status>("status", { "connected": "connected" }, { "namespace": "discord" });
	const [login,] = useReplicant<Login>("login", { "appID": "", "server": "", "token": "" }, { "namespace": "discord" });
	const [msg, setMsg] = useState<null | { isJSON: boolean, channelID: string, channelName?: string, runID?: string }>(null);
	const channelID = msg && msg.channelID ? msg.channelID : login?.scheduleChannel;
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
		if (!msgRef.current || !content || !channelID) return;
		msgRef.current.value = "";

		let parsed: string | MessageCreateOptions = content;
		if (msg?.isJSON) parsed = JSON.parse(content) as MessageCreateOptions;

		const data = { channelID: channelID, content: parsed, runID: msg?.runID };
		console.log(await sendTo("postMessage", data));
		if (msg) setMsg({ channelID: channelID, isJSON: false, channelName: msg.channelName });
	}

	function clear() {
		if (!channelID) return;
		setMsg({ isJSON: false, channelID: channelID, channelName: msg?.channelName });
		if (msgRef.current) msgRef.current.value = "";
	}

	return <Form>
		<ButtonGroup className="float-end">
			<Button onClick={sendToF("updateEvents")} disabled={status.syncingEvents}>Update Events</Button>
			<Button variant="outline-danger" onClick={() => confirm("Delete orphaned/unpaired events from the bot?") && sendTo("deleteOrphanEvents")} disabled={status.syncingEvents}><TrashFill /></Button>
		</ButtonGroup>
		{/* <Form.Check type="switch" label="Donation Messages" checked={status?.postDonations} onClick={e => setStatus({ ...status, postDonations: !status.postDonations })} /> */}
		<Form.Check type="switch" label="Schedule Messages" checked={status?.postSchedule} onClick={e => setStatus({ ...status, postSchedule: !status.postSchedule })} />
		<Form.Check type="switch" label="Start & End Events" checked={status?.startAndEndEvents} onClick={e => setStatus({ ...status, startAndEndEvents: !status.startAndEndEvents })} />


		<FloatingLabel label="Schedule Message Preview" className='mt-3'>
			<Form.Control as="textarea" ref={msgRef} onSubmit={post} />
		</FloatingLabel>
		<InputGroup className="mt-1">
			<Button className="flex-grow-1" disabled={!channelID} variant={msg?.runID ? "danger" : "outline-primary"} onClick={post}>
				<Send /> Send Message{msg && msg.channelName ? ` to #${msg.channelName}` : ""}
			</Button>
			<Button className="flex-grow-0" disabled={!channelID} variant="outline-secondary" onClick={clear}>
				<Ban />
			</Button>
		</InputGroup>
	</Form>
}

const root = createRoot(document.getElementById('root')!);
root.render(<div className="m-3">
	Status: <CommPointStatus bundle="discord" />
	<DiscordControl />
</div>);

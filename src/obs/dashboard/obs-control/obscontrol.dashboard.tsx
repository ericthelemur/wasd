import '../../../common/uwcs-bootstrap.css';
import './obscontrol.scss';

import { sendTo, sendToF } from '../../messages';
import { FormEvent, useRef } from 'react';
import { RecordFill, Wifi } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import { createRoot } from 'react-dom/client';
import {
	Configschema, ConnStatus, ObsLogin, ObsStatus, PreviewScene, ProgramScene, SceneList
} from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import NodeCG from '@nodecg/types';

declare const nodecg: NodeCG.ClientAPI<Configschema>;

function Status({ status }: { status?: ConnStatus }) {
	switch (status) {
		case "connected": return <Badge bg="success">Connected</Badge>
		case "connecting": return <Badge bg="info">Connecting</Badge>
		case "disconnected": return <Badge bg="danger">Disconnected</Badge>
		case "error": return <Badge bg="danger">Error</Badge>
	}
	return null;
}

export function OBSStatuses() {
	const [previewScene,] = useReplicant<PreviewScene>("previewScene", null);
	const [programScene,] = useReplicant<ProgramScene>("programScene", null);
	const [status,] = useReplicant<ObsStatus>("obsStatus", { "connection": "disconnected", "streaming": false, "recording": false, "studioMode": false, "transitioning": false, "moveCams": false, "controlRecording": false });

	return <div className="mt-3">
		<Stack direction="horizontal" gap={1}>
			Status:
			<Status status={status?.connection} />
			{status?.streaming && <Badge bg="danger"><Wifi /> LIVE</Badge>}
			{status?.recording && <Badge bg="danger"><RecordFill /> Recording</Badge>}
			{status?.transitioning && <Badge bg="info">Transitioning</Badge>}
		</Stack>
		{status?.connection === "connected" &&
			<Stack direction="horizontal" gap={1}>
				{previewScene && <>Preview: <Badge bg="secondary">{previewScene.name}</Badge></>}
				{programScene && <>Program: <Badge bg="danger">{programScene.name}</Badge></>}
			</Stack>}
	</div>
}

function ConnectForm() {
	const [login,] = useReplicant<ObsLogin>("obsLogin", { ip: "ws://localhost:4455", password: "" });
	const urlElem = useRef<HTMLInputElement>(null);
	const pwElem = useRef<HTMLInputElement>(null);

	function connect(e: FormEvent) {
		e.preventDefault();
		nodecg.log.info('Attempting to connect', urlElem.current?.value, pwElem.current?.value);
		(sendTo("obsConnect", {
			ip: urlElem.current!.value,
			password: pwElem.current!.value
		}) as unknown as Promise<void>
		).then(() => nodecg.log.info('successfully connected to obs'))
			.catch((err: any) => nodecg.log.error('failed to connect to obs:', err));
	}

	return (
		<Form onSubmit={connect} className="vstack gap-3">
			<FloatingLabel className="flex-grow-1" controlId="url" label="OBS URL">
				<Form.Control ref={urlElem} placeholder="ws://localhost:4455" defaultValue={login?.ip} />
			</FloatingLabel>
			<FloatingLabel controlId="password" label="Password">
				<Form.Control ref={pwElem} type="password" placeholder="Password" defaultValue={login?.password} />
			</FloatingLabel>
			<Button type="submit">Connect</Button>
		</Form>
	)
}


function DisconnectForm() {
	function disconnect(e: FormEvent) {
		e.preventDefault();
		if (confirm("Are you sure you want to disconnect from OBS?")) {
			nodecg.log.info('Attempting to disconnect');
			(sendTo("obsDisconnect", {}) as unknown as Promise<void>
			).then(() => nodecg.log.info('successfully disconnected from obs'))
				.catch((err: any) => nodecg.log.error('failed to disconnect to obs:', err));
		}
	}

	return (
		<Form onSubmit={disconnect} className="vstack gap-3 mt-2">
			<Button variant="outline-danger" type="submit">Disconnect</Button>
		</Form>
	)
}

function SceneButton(props: { sceneName: string, studio: boolean, disabled?: boolean }) {
	const args = { sceneName: props.sceneName }
	return <Button variant={props.studio ? "outline-primary" : "primary"} disabled={props.disabled}
		onClick={props.studio ? sendToF("preview", args) : sendToF("transition", args)}>
		{props.sceneName}
	</Button>
}

function ScenesForm() {
	const [sceneListRep,] = useReplicant<SceneList>("sceneList", []);
	const [previewSceneRep,] = useReplicant<PreviewScene>("previewScene", null);
	const [programSceneRep,] = useReplicant<ProgramScene>("programScene", null);
	const [status, setStatus] = useReplicant<ObsStatus>("obsStatus", { "connection": "disconnected", "streaming": false, "recording": false, "studioMode": false, "transitioning": false, "moveCams": false, "controlRecording": true });

	return <div className="vstack">
		<details className="mb-2 d-block card p-2">
			<summary><span className="h6">Settings</span></summary>
			<InputGroup className="mt-2">
				<InputGroup.Text>
					{status && <Form.Check type="switch" className="d-inline-block ms-3" checked={status.moveCams}
						label="Move Cams" onChange={() => setStatus({ ...status, moveCams: !status.moveCams })} />}
				</InputGroup.Text>
				<InputGroup.Text>
					{status && <Form.Check type="switch" className="d-inline-block ms-3" checked={status.controlRecording}
						label="Record" onChange={() => setStatus({ ...status, controlRecording: !status.controlRecording })} />}
				</InputGroup.Text>
			</InputGroup>
			<InputGroup className="mt-2">
				<Button variant="outline-warning" onClick={() => nodecg.sendMessage("refreshOBS")}>Refresh Info</Button>
				<Button variant="outline-danger" onClick={() => nodecg.sendMessage("moveOBSSources")}>Force Update Sources</Button>
			</InputGroup>
		</details>
		<Button className="my-2" onClick={() => sendTo(status?.recording ? "stopRecording" : "startRecording", undefined)}>{status?.recording ? "Stop Recording" : "Start Recording"}</Button>

		<h4>{status?.studioMode ? "Preview" : "Transition"}</h4>
		<div className="gap-2 mb-2 d-flex flex-wrap">
			{sceneListRep?.map((s) => <SceneButton key={s.name} sceneName={s.name} studio={Boolean(status?.studioMode)}
				disabled={status?.transitioning || (status?.studioMode ? previewSceneRep : programSceneRep)?.name === s.name} />)}
		</div>
		{status?.studioMode && <Button variant="primary" disabled={status?.transitioning} onClick={sendToF("transition", {})}>Transition</Button>}
	</div>
}


function ControlForms() {
	const [status,] = useReplicant<ObsStatus>("obsStatus", { "connection": "disconnected", "streaming": false, "recording": false, "studioMode": false, "transitioning": false, "moveCams": false, "controlRecording": false });
	if (status) {
		if (status.connection !== "connected") {
			return <ConnectForm />
		} else {
			return <>
				<ScenesForm />
				<DisconnectForm />
			</>
		}
	}
	return null;
}

export function MsgControlPanel() {
	return <div className="m-3">
		<ControlForms />
		<OBSStatuses />
	</div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<MsgControlPanel />);

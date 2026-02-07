import '../../../common/uwcs-bootstrap.css';
import './obscontrol.scss';

import { RecordFill, Wifi } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import { createRoot } from 'react-dom/client';
import { PreviewScene, ProgramScene, SceneList, Status } from 'types/schemas/obs';
import { useReplicant } from 'use-nodecg';
import listeners, { ListenerTypes, sendTo, sendToF } from '../../messages';
import { getNodeCG } from 'common/utils';
import { Replicants } from "../../extension/obs";
import { CreateCommPointConnect } from 'common/commpoint/login';


export function OBSStatuses({ status }: { status: Status }) {
	const [previewScene,] = useReplicant<PreviewScene>("previewScene", null, { namespace: "obs" });
	const [programScene,] = useReplicant<ProgramScene>("programScene", null, { namespace: "obs" });
	if (!status) return;

	return <div className="mt-3">
		{status.streaming && <Badge bg="danger"><Wifi /> LIVE</Badge>}{" "}
		{status.recording && <Badge bg="danger"><RecordFill /> Recording</Badge>}{" "}
		{status.transitioning && <Badge bg="info">Transitioning</Badge>}{" "}
		{status.connected === "connected" &&
			<Stack direction="horizontal" gap={1}>
				{previewScene && <>Preview: <Badge bg="secondary">{previewScene.name}</Badge></>}
				{programScene && <>Program: <Badge bg="danger">{programScene.name}</Badge></>}
			</Stack>}
	</div>
}


function SceneButton(props: { sceneName: string, studio: boolean, disabled?: boolean }) {
	const args = { sceneName: props.sceneName }
	return <Button variant={props.studio ? "outline-primary" : "primary"} disabled={props.disabled}
		onClick={props.studio ? sendToF("preview", args) : sendToF("transition", args)}>
		{props.sceneName}
	</Button>
}

const defaultStatus = { "connected": "disconnected" as const, "streaming": false, "recording": false, "studioMode": false, "transitioning": false, "moveCams": false, "controlRecording": true };

function ScenesForm() {
	const [sceneListRep,] = useReplicant<SceneList>("sceneList", []);
	const [previewSceneRep,] = useReplicant<PreviewScene>("previewScene", null, { namespace: "obs" });
	const [programSceneRep,] = useReplicant<ProgramScene>("programScene", null, { namespace: "obs" });
	const [status, setStatus] = useReplicant<Status>("status", defaultStatus, { namespace: "obs" });

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
				<Button variant="outline-warning" onClick={sendToF("refreshOBS")}>Refresh Info</Button>
				<Button variant="outline-danger" onClick={sendToF("moveOBSSources")}>Force Update Sources</Button>
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


const ControlForm = CreateCommPointConnect<ListenerTypes, Replicants>("obs", listeners, {
	ip: "OBS Websocket IP",
	password: "OBS Websocket Password",
} as const, { ip: "127.0.0.1", password: "" }, defaultStatus, OBSStatuses);

export function MsgControlPanel() {
	return <div className="m-3">
		<ScenesForm />
	</div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<>
	<ControlForm />
	<ScenesForm />
</>);

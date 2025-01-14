import '../../../common/uwcs-bootstrap.css';

import { duration } from 'moment';
import React, { FormEvent, useEffect, useRef, useState } from 'react';
import {
	ArrowCounterclockwise, BrushFill, PauseFill, PenFill, PlayFill, SendFill
} from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { createRoot } from 'react-dom/client';
import { Configschema, ConnStatus, Countdown, StreamState, XrStatus } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
import { RecordFill, Wifi } from 'react-bootstrap-icons';
import Stack from 'react-bootstrap/Stack';

import { sendTo as sendToOBS } from '../../../obs/messages';
import { sendTo as sendToCountdown } from '../../../countdown/messages';
import { PreviewScene, ProgramScene, ObsStatus } from 'types/schemas';
import { Timer } from 'speedcontrol-util/types/speedcontrol/schemas/timer';
import type NodeCG from '@nodecg/types';
import { RunDataActiveRun, RunFinishTimes } from 'speedcontrol-util/types/speedcontrol';
import { msToTimeString } from 'countdown/utils';

declare const nodecg: NodeCG.ServerAPI;

function OBSStatus({ status }: { status?: ConnStatus }) {
	switch (status) {
		case "connected": return <Badge bg="success">Connected</Badge>
		case "connecting": return <Badge bg="info">Connecting</Badge>
		case "disconnected": return <Badge bg="danger">Disconnected</Badge>
		case "error": return <Badge bg="danger">Error</Badge>
	}
	return null;
}

// These should be imported from the relevant sections, but Parcel is having a fit, so not atm
export function OBSStatuses() {
	const [previewScene,] = useReplicant<PreviewScene>("previewScene", null);
	const [programScene,] = useReplicant<ProgramScene>("programScene", null);
	const [status,] = useReplicant<ObsStatus>("obsStatus", { "connection": "disconnected", "streaming": false, "recording": false, "studioMode": false, "transitioning": false, "moveCams": false, "controlRecording": false });

	return <div className="mt-0">
		<Stack direction="horizontal" gap={1}>
			<b>OBS:</b>
			<OBSStatus status={status?.connection} />
			{status?.streaming && <Badge bg="danger"><Wifi /> LIVE</Badge>}
			{status?.recording && <Badge bg="danger"><RecordFill /> Recording</Badge>}
			{status?.transitioning && <Badge bg="info">Transitioning</Badge>}
		</Stack>
		{status?.connection === "connected" &&
			<Stack direction="horizontal" gap={1}>
				<b style={{ opacity: 0 }}>OBS:</b>
				{previewScene && <Badge bg="secondary"><BrushFill /> {previewScene.name}</Badge>}
				{programScene && <Badge bg="danger"><PlayFill /> {programScene.name}</Badge>}
			</Stack>}
	</div>
}

export function XRStatus() {
	const [status,] = useReplicant<XrStatus>("xrStatus", { "connection": "disconnected" });
	switch (status?.connection) {
		case "connected": return <Badge bg="success">Connected</Badge>
		case "connecting": return <Badge bg="info">Connecting</Badge>
		case "disconnected": return <Badge bg="danger">Disconnected</Badge>
		case "error": return <Badge bg="danger">Error</Badge>
	}
	return null;
}

export function MixerStatuses() {
	return <div className="mt-0">
		<Stack direction="horizontal" gap={1}>
			<b>Mixer:</b>
			<XRStatus />
		</Stack>
	</div>
}


function AllStatuses() {
	return <div className="statuses">
		<MixerStatuses />
		<OBSStatuses />
	</div>
}


function MainControls() {
	const [lastScene, setLastScene] = useState("");
	const [programScene,] = useReplicant<ProgramScene>("programScene", null);
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });
	const [obsStatus,] = useReplicant<ObsStatus>("obsStatus", { connection: "disconnected", "recording": false, "streaming": false, transitioning: false, studioMode: true, moveCams: true, controlRecording: false });


	if (!state || !obsStatus) return null;
	function goToScene(newSceneName: string) {
		if (programScene) setLastScene(programScene.name);
		sendToOBS("transition", { sceneName: newSceneName });
	}
	const args = { lastScene, goToScene, programScene: programScene?.name || "", controlRecording: obsStatus.controlRecording }
	return <Tabs id="main-state-tabs" activeKey={state.state} onSelect={s => s && setState({ ...state, state: s } as StreamState)}>
		<Tab eventKey="BREAK" title="BREAK"><BreakControls {...args} /></Tab>
		<Tab eventKey="INTRO" title="INTRO"><IntroControls {...args} /></Tab>
		<Tab eventKey="RUN" title="RUN"><RunControls {...args} /></Tab>
		<Tab eventKey="OUTRO" title="OUTRO"><OutroControls {...args} /></Tab>
	</Tabs>
}

interface ControlPage {
	lastScene: string;
	goToScene: (newSceneName: string) => void;
	programScene: string;
	controlRecording: boolean;
}

function CountdownRow() {
	const [countdown,] = useReplicant<Countdown>("countdown", { "value": 0, "state": "paused" });
	if (!countdown) return;

	function playPauseCountdown(e: FormEvent) {
		e.preventDefault();
		if (countdown!.state == "ended") {
			sendToCountdown("countdown.start");
		} else if (countdown!.state == "running") {
			sendToCountdown("countdown.pause");
		} else if (countdown!.state == "paused") {
			sendToCountdown("countdown.unpause");
		}
	}
	const going = countdown.state == "running";
	return <InputGroup className="d-flex">
		<Button className="flex-grow-1" variant={going ? "outline-primary" : "primary"} onClick={playPauseCountdown}>{going ? "Pause" : "Play"} Countdown</Button>
		<InputGroup.Text className={going ? "text-danger" : ""}>{msToTimeString(countdown.value)}</InputGroup.Text>
		<Button variant="outline-primary" style={{ flexGrow: 0 }} onClick={(e) => { e.preventDefault(); sendToCountdown("countdown.add", 60 * 1000); }}>+1m</Button>
	</InputGroup>
}

function BreakControls({ goToScene, programScene, controlRecording }: ControlPage) {
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });

	return <div className="vstack gap-2">
		<CountdownRow />
		<Button variant="outline-primary" onClick={() => goToScene(programScene == "BREAK" ? "COMMS" : "BREAK")}>{programScene == "BREAK" ? "Scene COMMS" : "Back to BREAK"}</Button>
		<Button onClick={() => { setState({ ...state, state: "INTRO" }); goToScene("COMMS"); controlRecording && sendToOBS("startRecording") }}>Intro Phase (Scene COMMS{controlRecording && "; Rec start"})</Button>
	</div>
}

function IntroControls({ lastScene, goToScene, programScene, controlRecording }: ControlPage) {
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });

	return <div className="vstack gap-2">
		<Button disabled={programScene == "COMMS"} variant="outline-primary" onClick={() => goToScene("COMMS")}>Scene COMMS (no runner)</Button>
		<Button disabled={programScene == "COMMS-1"} onClick={() => goToScene("COMMS-1")}>Scene COMMS-# (no game)</Button>
		<Button variant="primary" onClick={() => { setState({ ...state, state: "RUN" }); goToScene("RUN-1"); }}>RUN Phase (Scene RUN-#)</Button>
		<Button variant="outline-primary" onClick={() => {
			controlRecording && sendToOBS("stopRecording");
			setState({ ...state, state: "BREAK" });
			goToScene("BREAK");
		}}>Back to BREAK Phase (Scene BREAK{controlRecording && "; Rec stop"})</Button>
	</div>
}

function OutroControls({ lastScene, goToScene, programScene, controlRecording }: ControlPage) {
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });

	return <div className="vstack gap-2">
		<Button disabled={programScene == "COMMS-1"} onClick={() => goToScene("COMMS-1")}>Scene COMMS-# (no game)</Button>
		<Button disabled={programScene == "COMMS"} variant="outline-primary" onClick={() => goToScene("COMMS")}>Scene COMMS (no runner)</Button>
		<Button onClick={() => {
			controlRecording && sendToOBS("stopRecording");
			setState({ ...state, state: "BREAK" });
			goToScene("BREAK");
			nodecg.sendMessageToBundle("changeToNextRun", "nodecg-speedcontrol");
		}}>BREAK Phase (Scene BREAK{controlRecording && "; Rec stop"}; Next Run)</Button>
		<Button variant="outline-primary" onClick={() => { setState({ ...state, state: "RUN" }); goToScene("RUN-1") }}>Back to RUN Phase (Scene RUN-#)</Button>
	</div>
}

function TimerButton() {
	const [run,] = useReplicant<RunDataActiveRun>("runDataActiveRun", { id: "", teams: [], customData: {} }, { namespace: "nodecg-speedcontrol" });
	const [timer,] = useReplicant<Timer>("timer", { time: "", state: "finished", milliseconds: 0, timestamp: 0, teamFinishTimes: {} }, { namespace: "nodecg-speedcontrol" });

	if (!run) return <Button disabled={true} />
	if (run.teams.length == 0) return <Button disabled={true}>No Teams</Button>;
	if (run.teams.length > 1) return <Button disabled={true}>Use Timer Control</Button>;
	return <Button onClick={() => {
		if (timer?.state != "running") {
			nodecg.sendMessageToBundle("timerStart", "nodecg-speedcontrol");
		} else {
			nodecg.sendMessageToBundle("timerStop", "nodecg-speedcontrol", { id: run.teams[0].id });
		}
	}}>
		{timer?.state != "running" ? "Start" : "Stop"} Run Timer</Button>
}

function RunControls({ lastScene, goToScene, programScene }: ControlPage) {
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK", "minsBehind": 0 });

	return <div className="vstack gap-2">
		<TimerButton />
		<Button disabled={programScene == "RUN-1"} onClick={() => { goToScene("RUN-1") }}>Scene RUN-#</Button>
		<Button disabled={programScene == "COMMS-1"} variant="outline-primary" onClick={() => { goToScene("COMMS-1") }}>Scene COMMS-#</Button>
		<Button disabled={programScene == "COMMS"} variant="outline-primary" onClick={() => { goToScene("COMMS") }}>Scene COMMS</Button>
		<Button onClick={() => { setState({ ...state, state: "OUTRO" }); goToScene("COMMS-1"); }}>State OUTRO (Scene COMMS-#)</Button>
	</div>
}

function MainForm() {
	const [obsStatus,] = useReplicant<ObsStatus>("obsStatus", { connection: "disconnected", "recording": false, "streaming": false, transitioning: false, studioMode: true, moveCams: true, controlRecording: false });

	return <div className="m-3 vstack gap-3">
		<AllStatuses />
		{obsStatus?.connection == "connected" && <MainControls />}
	</div>
}


const root = createRoot(document.getElementById('root')!);
root.render(<MainForm />);

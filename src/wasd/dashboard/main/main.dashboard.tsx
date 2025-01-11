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
	const [status,] = useReplicant<ObsStatus>("obsStatus", { "connection": "disconnected", "streaming": false, "recording": false, "studioMode": false, "transitioning": false, "moveCams": false });

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
	const [obsStatus,] = useReplicant<ObsStatus>("obsStatus", { connection: "disconnected", "recording": false, "streaming": false, transitioning: false, studioMode: true, moveCams: true });
	const [programScene,] = useReplicant<ProgramScene>("programScene", null);
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });

	if (!obsStatus) return null;
	function goToScene(newSceneName: string) {
		if (programScene) setLastScene(programScene.name);
		sendToOBS("transition", { sceneName: newSceneName });
	}
	const args = { lastScene, goToScene, programScene: programScene?.name || "" }
	console.log(args);
	switch (state?.state) {
		case "BREAK": return <BreakControls {...args} />
		case "INTRO": return <IntroOutroControls {...args} />
		case "RUN": return <RunControls {...args} />
		case "OUTRO": return <IntroOutroControls {...args} />
		default: return <RunControls {...args} />
	}
}

interface ControlPage {
	lastScene: string;
	goToScene: (newSceneName: string) => void;
	programScene: string;
}

function BreakControls({ goToScene, programScene }: ControlPage) {
	const [countdown,] = useReplicant<Countdown>("countdown", { "display": "00:00", "value": 0, "state": "paused", msg: "Back Soon" });
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });

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

	return <div className="vstack gap-2">
		<InputGroup className="d-flex">
			<Button className="flex-grow-1" onClick={playPauseCountdown}>{countdown?.state == "running" ? "Pause" : "Play"} Countdown</Button>
			<Button variant="outline-primary" style={{ flexGrow: 0 }} onClick={(e) => { e.preventDefault(); sendToCountdown("countdown.add", 60 * 1000); }}>+1m</Button>
		</InputGroup>
		<Button variant="outline-primary" onClick={() => goToScene(programScene == "BREAK" ? "COMMS" : "BREAK")}>{programScene == "BREAK" ? "Comms Insert" : "Back to BREAK"}</Button>
		<Button onClick={() => { setState({ state: "INTRO" }); goToScene("COMMS"); sendToOBS("startRecording") }}>Intro Phase (Scene COMMS; Rec start)</Button>
	</div>
}

function IntroOutroControls({ lastScene, goToScene }: ControlPage) {
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });
	const intro = state?.state == "INTRO";

	return <div className="vstack gap-2">
		<Button disabled={true}>Go to COMMS (no runner)</Button>
		<Button disabled={true}>Go to COMMS-# (no game)</Button>
		<Button variant={intro ? "primary" : "outline-primary"} onClick={() => { setState({ state: "RUN" }); goToScene("RUN-1") }}>{!intro && "Back to "}RUN Phase (Scene RUN-#)</Button>
		{intro
			? <Button variant="outline-primary" onClick={() => { sendToOBS("stopRecording"); setState({ state: "BREAK" }); goToScene("BREAK") }}>Back to BREAK Phase (Scene BREAK; Rec stop)</Button>
			: <Button onClick={() => { sendToOBS("stopRecording"); setState({ state: "BREAK" }); goToScene("BREAK"); nodecg.sendMessageToBundle("changeToNextRun", "nodecg-speedcontrol") }}>BREAK Phase (Scene BREAK; Rec stop; Next Run)</Button>
		}
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

function RunControls({ lastScene, goToScene }: ControlPage) {
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });

	return <div className="vstack gap-2">
		<TimerButton />
		<Button onClick={() => { goToScene("COMMS") } /* TODO Surpress DCA changes */}>Comms Insert</Button>
		<Button onClick={() => { setState({ state: "OUTRO" }); goToScene("COMMS"); }}>State OUTRO</Button>
	</div>
}


function StateButton({ s }: { s: StreamState["state"] }) {
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });
	if (!state) return null;

	return <Button variant={state.state == s ? "primary" : "outline-primary"}
		disabled={state.state == s} onClick={() => setState({ state: s })}>{s}</Button>
}

function MainForm() {
	return <div className="m-3 vstack gap-3">
		<AllStatuses />
		<InputGroup>
			<StateButton s="BREAK" />
			<StateButton s="INTRO" />
			<StateButton s="RUN" />
			<StateButton s="OUTRO" />
		</InputGroup>
		<MainControls />
	</div>
}


const root = createRoot(document.getElementById('root')!);
root.render(<MainForm />);

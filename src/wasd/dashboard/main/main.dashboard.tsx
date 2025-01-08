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
import { Configschema, ConnStatus, Countdown, XrStatus } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
import { RecordFill, Wifi } from 'react-bootstrap-icons';
import Stack from 'react-bootstrap/Stack';

import { sendTo as sendToOBS } from '../../../obs/messages';
import { sendTo as sendToCountdown } from '../../../countdown/messages';
import { PreviewScene, ProgramScene, ObsStatus } from 'types/schemas';
import { Timer } from 'speedcontrol-util/types/speedcontrol/schemas/timer';
import type NodeCG from '@nodecg/types';

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
	return <div className="statuses mb-3">
		<MixerStatuses />
		<OBSStatuses />
	</div>
}


function MainControls() {
	const [lastScene, setLastScene] = useState("");
	const [programScene,] = useReplicant<ProgramScene>("programScene", null);

	function goToScene(newSceneName: string) {
		if (programScene) setLastScene(programScene.name);
		sendToOBS("transition", { sceneName: newSceneName });
	}

	switch (programScene?.name) {
		case "BREAK": return <BreakControls lastScene={lastScene} goToScene={goToScene} />
		case "COMMS": return <CommsControls lastScene={lastScene} goToScene={goToScene} />
		default: return <RunControls lastScene={lastScene} goToScene={goToScene} />
	}
}

interface ControlPage {
	lastScene: string;
	goToScene: (newSceneName: string) => void;
}

function BreakControls({ lastScene, goToScene }: ControlPage) {
	const [countdown,] = useReplicant<Countdown>("countdown", { "display": "00:00", "value": 0, "state": "paused", msg: "Back Soon" });

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
		<Button onClick={playPauseCountdown}>{countdown?.state == "running" ? "Pause" : "Play"} Countdown</Button>
		<Button onClick={(e) => { e.preventDefault(); sendToCountdown("countdown.add", 60 * 1000); }}>Add 1 Min</Button>
		<Button onClick={() => goToScene("COMMS")}>Comms for Intro</Button>
	</div>
}

function CommsControls({ lastScene, goToScene }: ControlPage) {
	return <div className="vstack gap-2">
		<Button onClick={() => goToScene(lastScene)}>Back to {lastScene}</Button>
		<Button>Unmute Runner</Button>
		<Button>Go to RUN-#</Button>
	</div>
}

function RunControls({ lastScene, goToScene }: ControlPage) {
	const [timer,] = useReplicant<Timer>("timer", { time: "", state: "finished", milliseconds: 0, timestamp: 0, teamFinishTimes: {} }, { namespace: "nodecg-speedcontrol" });

	return <div className="vstack gap-2">
		<Button onClick={() => nodecg.sendMessageToBundle(timer?.state != "running" ? "timerStart" : "timerStop", "nodecg-speedcontrol")}>{timer?.state != "running" ? "Start" : "Stop"} Run Timer</Button>
		<Button onClick={() => goToScene("COMMS") /* TODO Surpress DCA changes */}>Comms Temp</Button>
		<Button onClick={() => { goToScene("COMMS"); nodecg.sendMessageToBundle("changeToNextRun", "nodecg-speedcontrol") }}>Comms for Outro <br /><small>(Move to Next Game)</small></Button>
	</div>
}


function MainForm() {
	return <div className="m-3">
		<AllStatuses />
		<MainControls />
	</div>
}


const root = createRoot(document.getElementById('root')!);
root.render(<MainForm />);

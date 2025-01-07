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

import NodeCG from '@nodecg/types';

import Editable from '../../../common/components/editable';
import { sendTo } from '../../common/listeners';

import { PreviewScene, ProgramScene, ObsStatus } from 'types/schemas';

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
	return <div className="hstack">
		<Button>Start Break</Button>
		<Button>Go to Comms</Button>
		<Button>Go to Run</Button>
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

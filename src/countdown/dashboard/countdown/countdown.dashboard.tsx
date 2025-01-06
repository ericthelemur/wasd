import '../../../common/uwcs-bootstrap.css';

import { duration } from 'moment';
import React, { FormEvent, useEffect, useRef, useState } from 'react';
import {
	ArrowCounterclockwise, PauseFill, PenFill, PlayFill, SendFill
} from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import { createRoot } from 'react-dom/client';
import { Configschema, Countdown } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import NodeCG from '@nodecg/types';

import Editable from '../../../common/components/editable';
import { sendTo } from '../../messages';

declare const nodecg: NodeCG.ClientAPI<Configschema>;

function Status({ state }: { state?: string }) {
	switch (state) {
		case "paused": return <Badge className="h3" bg="warning">Paused</Badge>
		case "ended": return <Badge className="h3" bg="success">Ended</Badge>
		case "running": return <Badge className="h3" bg="danger">Running</Badge>
	}
	return null;
}

function timeStringToMs(timeString: string | undefined) {
	if (!timeString) return 0;
	if (typeof timeString !== 'string') {
		throw new TypeError('Expected string');
	}

	const format = /^(\d{1,2}:){0,2}\d{1,2}$/;
	if (!format.test(timeString)) {
		throw new Error(`Bad timeString format ${timeString}`);
	}

	const parts = timeString.split(':').map(part => parseInt(part, 10)).reverse();

	return duration({ seconds: parts[0], minutes: parts[1], hours: parts[2] }).asMilliseconds();
}

function msToTimeString(ms: number | undefined) {
	if (!ms) return "00:00";

	// const mins = Math.ceil(ms / (1000 * 60));
	// return `${mins} mins`

	const d = duration({ milliseconds: ms });

	return [(d.hours() || null), d.minutes(), d.seconds()]
		.filter(d => d !== null)
		.map(d => String(d).padStart(2, '0'))
		.join(':');
}


export function TimerEditModal({ countdown, setEditing }: { countdown: Countdown, setEditing: React.Dispatch<React.SetStateAction<boolean>> }) {
	const minsElem = useRef<HTMLInputElement>(null);
	const secsElem = useRef<HTMLInputElement>(null);

	const [mins, setMins] = useState<string>(String(Math.trunc(countdown.value / 60000)).padStart(2, "0"));
	const [secs, setSecs] = useState<string>(String(Math.trunc(countdown.value / 1000) % 60).padStart(2, "0"));

	function submit() {
		const m = Number(mins) ?? 0;
		const s = Number(secs) ?? 0;
		const time = m * 60 + s;

		if (time) {
			sendTo("countdown.set", time * 1000);
			setEditing(false);
		}
	}

	function clean(t: string, mins: boolean = false) {
		if (mins && t.includes(":")) secsElem.current!.focus();
		return (t ?? "").replace(/\D+/, "").replace(/^0+/, "").padStart(2, "0");
	}

	return <Modal show={true} onHide={() => setEditing(false)}>
		<Modal.Header closeButton className="h4">Edit Timer</Modal.Header>
		<Modal.Body>
			<Form onSubmit={submit} className="vstack gap-3">
				<Status state={countdown.state} />
				<InputGroup>
					<Form.Control ref={minsElem} placeholder="05" value={mins} onFocus={e => e.target.select()} onChange={() => setMins(clean(minsElem.current!.value, true))} autoFocus />
					<Form.Control ref={secsElem} placeholder="00" value={secs} onFocus={e => e.target.select()} onChange={() => setSecs(clean(secsElem.current!.value))} />
					<Button className="flex-grow-0" type="submit" onClick={submit}><SendFill /></Button>
				</InputGroup>
			</Form>
		</Modal.Body>
	</Modal>
}


function CountdownForm() {
	const [countdown,] = useReplicant<Countdown>("countdown", { "display": "00:00", "value": 0, "state": "paused", msg: "Back Soon" });

	const [editing, setEditing] = useState<boolean>(false);

	if (!countdown) return null;

	function resetCountdown(e: FormEvent) {
		e.preventDefault();
		sendTo("countdown.reset");
	}

	function playPauseCountdown(e: FormEvent) {
		e.preventDefault();
		if (countdown!.state == "ended") {
			sendTo("countdown.start");
		} else if (countdown!.state == "running") {
			sendTo("countdown.pause");
		} else if (countdown!.state == "paused") {
			sendTo("countdown.unpause");
		}
	}

	function addTime(t: number) {
		return (e: FormEvent) => {
			e.preventDefault();
			sendTo("countdown.add", t * 1000);
		}
	}

	return (
		<Form onSubmit={resetCountdown} className="vstack gap-3 m-3">
			{editing && <TimerEditModal countdown={countdown} setEditing={setEditing} />}
			<Status state={countdown.state} />
			<Editable className="flex-grow-1 flex-shrink-1" text={countdown.msg} setText={(v) => countdown.msg = v} type="multi" container={true} />
			<InputGroup>
				<Form.Control readOnly disabled value={msToTimeString(countdown.value)} />
				<Button type="button" variant="outline-primary" onClick={() => setEditing(true)}><PenFill /></Button>
			</InputGroup>
			<InputGroup>
				<Button className="flex-grow-1" type="submit" onClick={playPauseCountdown}>{countdown?.state == "running" ? <PauseFill /> : <PlayFill />}</Button>
				<Button className="flex-grow-1" type="button" variant="outline-primary" disabled={countdown?.state == "running"} onClick={resetCountdown}><ArrowCounterclockwise /></Button>
			</InputGroup>
			<InputGroup>
				<Button className="flex-grow-1" type="button" variant="outline-primary" onClick={addTime(30)}>+30s</Button>
				<Button className="flex-grow-1" type="button" variant="outline-primary" onClick={addTime(60)}>+1 min</Button>
				<Button className="flex-grow-1" type="button" variant="outline-primary" onClick={addTime(5 * 60)}>+5 min</Button>
			</InputGroup>
		</Form>
	)
}


const root = createRoot(document.getElementById('root')!);
root.render(<CountdownForm />);

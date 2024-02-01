import { FormEvent, useRef } from 'react';
import { PauseFill, PlayFill } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { createRoot } from 'react-dom/client';
import { Configschema, Countdown } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
import Editable from 'wasd-common/shared/components/editable';

import NodeCG from '@nodecg/types';

import { sendTo } from '../../common/listeners';

declare const nodecg: NodeCG.ClientAPI<Configschema>;

function Status({ state }: { state?: string }) {
	switch (state) {
		case "paused": return <Badge className="h3" bg="warning">Paused</Badge>
		case "ended": return <Badge className="h3" bg="success">Ended</Badge>
		case "running": return <Badge className="h3" bg="danger">Running</Badge>
	}
	return null;
}

function CountdownForm() {
	const [countdown,] = useReplicant<Countdown>("countdown", { "display": "00:00", "state": "paused", msg: "Back Soon" });
	const timeElem = useRef<HTMLInputElement>(null);

	if (!countdown) return;
	const running = countdown.state === "running";
	const k = running ? { value: countdown.display } : { defaultValue: countdown.display }

	function startCountdown(e: FormEvent) {
		e.preventDefault();
		sendTo("countdown.start", { timeStr: timeElem.current?.value ?? "00:00" });
	}

	function pauseCountdown(e: FormEvent) {
		e.preventDefault();
		sendTo("countdown.pause", undefined);
	}

	return (
		<Form onSubmit={startCountdown} className="vstack gap-3 m-3">
			<Status state={countdown.state} />
			<FloatingLabel className="flex-grow-1" controlId="url" label="Countdown Time">
				<Form.Control ref={timeElem} placeholder="05:00" disabled={running} {...k} />
			</FloatingLabel>
			<InputGroup>
				<Button className="flex-grow-1" type="submit" disabled={running} onClick={startCountdown}><PlayFill /></Button>
				<Button className="flex-grow-1" type="button" disabled={!running} onClick={pauseCountdown}><PauseFill /></Button>
			</InputGroup>
			<div className="d-flex gap-3">
				Msg: <Editable className="flex-grow-1 flex-shrink-1" text={countdown.msg} setText={(v) => countdown.msg = v} type="multi" container={true} />
			</div>
		</Form>
	)
}


const root = createRoot(document.getElementById('root')!);
root.render(<CountdownForm />);

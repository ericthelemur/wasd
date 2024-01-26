import './xr18.scss';

import { sendTo, sendToF } from 'common/listeners';
import { FormEvent, useRef } from 'react';
import { RecordFill, Wifi } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import { createRoot } from 'react-dom/client';
import { Configschema, Login, XrStatus } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import NodeCG from '@nodecg/types';

declare const nodecg: NodeCG.ClientAPI<Configschema>;

function Status() {
	const [status,] = useReplicant<XrStatus>("xrStatus", { "connection": "disconnected" });
	switch (status?.connection) {
		case "connected": return <Badge bg="success">Connected</Badge>
		case "connecting": return <Badge bg="info">Connecting</Badge>
		case "disconnected": return <Badge bg="danger">Disconnected</Badge>
		case "error": return <Badge bg="danger">Error</Badge>
	}
	return null;
}

function Statuses() {

	return <div className="mt-3">
		<Stack direction="horizontal" gap={1}>
			Status:
			<Status />
		</Stack>
	</div>
}

function ConnectForm() {
	const [login,] = useReplicant<Login>("login", { "enabled": false, "ip": "", "xr18": true });
	const urlElem = useRef<HTMLInputElement>(null);
	const portElem = useRef<HTMLInputElement>(null);

	function connect(e: FormEvent) {
		e.preventDefault();
		nodecg.log.info('Attempting to connect', urlElem.current?.value, portElem.current?.value);
		(sendTo("connect", {
			ip: urlElem.current!.value,
			localPort: portElem.current!.valueAsNumber || undefined
		}) as unknown as Promise<void>
		).then(() => nodecg.log.info('successfully connected to xr18'))
			.catch((err: any) => nodecg.log.error('failed to connect to xr18:', err));
	}

	return (
		<Form onSubmit={connect} className="vstack gap-3">
			<FloatingLabel className="flex-grow-1" controlId="url" label="Mixer IP">
				<Form.Control ref={urlElem} placeholder="192.168.1.99" defaultValue={login?.ip} />
			</FloatingLabel>
			<FloatingLabel controlId="port" label="port">
				<Form.Control ref={portElem} type="number" inputMode="numeric" placeholder="10024" defaultValue={login?.localPort ?? 10024} />
			</FloatingLabel>
			<Button type="submit">Connect</Button>
		</Form>
	)
}


function DisconnectForm() {
	function disconnect(e: FormEvent) {
		e.preventDefault();
		if (confirm("Are you sure you want to disconnect from Mixer?")) {
			nodecg.log.info('Attempting to disconnect');
			(sendTo("disconnect", {}) as unknown as Promise<void>
			).then(() => nodecg.log.info('successfully disconnected from xr18'))
				.catch((err: any) => nodecg.log.error('failed to disconnect to xr18:', err));
		}
	}

	return (
		<Form onSubmit={disconnect} className="vstack gap-3 mt-2">
			<Button variant="outline-danger" type="submit">Disconnect</Button>
		</Form>
	)
}


function ControlForms() {
	const [status,] = useReplicant<XrStatus>("xrStatus", { "connection": "disconnected" });
	if (status) {
		if (status.connection === "disconnected" || status.connection === "error") {
			return <ConnectForm />
		} else {
			return <>
				<DisconnectForm />
			</>
		}
	}
	return null;
}

export function MsgControlPanel() {
	return <div className="m-3">
		<ControlForms />
		<Statuses />
	</div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<MsgControlPanel />);

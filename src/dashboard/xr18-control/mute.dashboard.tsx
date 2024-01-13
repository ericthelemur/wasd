import './xr18.scss';

import { sendToF } from 'common/listeners';
import { useEffect, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import { createRoot } from 'react-dom/client';
import { Channels, Configschema, XrStatus } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import NodeCG from '@nodecg/types';

declare const nodecg: NodeCG.ClientAPI<Configschema>;

export interface MuteSettings {
	mic?: string | null;
}

const defaultSettings: MuteSettings = {};

function fetchFromParams() {
	const url = new URL(window.location.href);
	var params = url.searchParams;
	var settings = { ...defaultSettings };
	settings.mic = params.get("mic");
	return settings;
}

function copyToParams(settings: MuteSettings) {
	const url = new URL(window.location.href);
	var params = url.searchParams;
	Object.entries(settings).filter(([k, v]) => v).forEach(([k, v]) => params.set(k, v.toString()));
	history.replaceState(null, "", url.href);
}

function Status() {
	const [status,] = useReplicant<XrStatus>("xrStatus", { "connected": false });
	switch (status?.connected) {
		case true: return <Badge bg="success">Connected</Badge>
		case false: return <Badge bg="danger">Disconnected</Badge>
	}
	return null;
}

function MicChoice({ setMic }: { setMic: (m: string) => void }) {
	const [channels,] = useReplicant<Channels>("channels", { "dcas": {}, "tech": "" });

	if (!channels || !channels.mics) return <>No active mics</>;
	return <div className="gap-2 mb-2 d-flex flex-wrap">
		{Object.keys(channels.mics).map(m => <Button variant="outline-primary" onClick={() => setMic(m)}>{m}</Button>)}
	</div>
}

function MuteControl({ mic }: { mic: string }) {

	return <div className="fs-1">
		<div className="gap-2 mb-2 d-flex flex-wrap">
			<Button variant="primary" onClick={sendToF("muteToggle", { mic: mic })}>Mute Toggle</Button>
			<Button variant="outline-primary" onClick={sendToF("muteToggle", { mic: mic })}>Push to Talk</Button>
			<Button variant="outline-primary" disabled onClick={sendToF("muteToggle", { mic: mic })}>Talkback</Button>
		</div>
	</div>
}


function MutePanel() {
	const [status,] = useReplicant<XrStatus>("xrStatus", { "connected": false });

	const [mic, setMic] = useState(fetchFromParams());
	useEffect(() => copyToParams(mic), [mic]);

	if (!status || !status.connected) return null;

	if (mic.mic) {
		return <MuteControl mic={mic.mic} />
	} else {
		return <MicChoice setMic={(m) => setMic({ mic: m })} />
	}
}

export function MuteControlPanel() {
	return <div className="m-3">
		<Status />
		<MutePanel />
	</div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<MuteControlPanel />);

import './xr18.scss';

import { sendTo, sendToF } from 'common/listeners';
import { useEffect, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { createRoot } from 'react-dom/client';
import { Channels, Configschema, Muted, TechMuted, XrStatus } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import NodeCG from '@nodecg/types';

declare const nodecg: NodeCG.ClientAPI<Configschema>;

function fetchFromParams() {
	const url = new URL(window.location.href);
	var params = url.searchParams;
	return params.get("mic");
}

function copyToParams(mic: string | null) {
	const url = new URL(window.location.href);
	var params = url.searchParams;
	// Object.entries(settings).filter(([k, v]) => v).forEach(([k, v]) => params.set(k, v.toString()));
	if (mic) params.set("mic", mic);
	else params.delete("mic");
	history.replaceState(null, "", url.href);
}

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

function MicChoice({ setMic }: { setMic: (m: string) => void }) {
	const [channels,] = useReplicant<Channels>("channels", { dcas: {}, mics: {}, tech: -1, scenes: {} });

	if (!channels || !channels.mics) return <>No active mics</>;
	return <div className="gap-2 mb-2 d-flex flex-wrap">
		{Object.keys(channels.mics).map(m => <Button key={m} variant="outline-primary" onClick={() => setMic(m)}>{m}</Button>)}
	</div>
}

function MuteIndicator({ micMuted }: { micMuted: boolean | undefined }) {
	const classes = "mute-indicator p-4 d-block"
	if (micMuted === false) return <Badge bg="success" className={classes}>LIVE</Badge>
	else if (micMuted === true) return <Badge bg="danger" className={classes}>MUTED</Badge>
	else return <Badge bg="warning" className={classes}>UNKNOWN</Badge>
}

function MuteControl({ mic }: { mic: string }) {
	const [muted,] = useReplicant<Muted>("muted", {});
	const [temp, setTemp] = useState(false);
	const [debounce, setDebounce] = useState<NodeJS.Timeout | undefined>(undefined);

	const micMuted = (muted ? muted[mic] : undefined);
	const longMuted = micMuted !== temp;

	function holdDown() {
		sendTo("setMute", { mic: mic, muted: !longMuted })
		setTemp(true);
	}
	function holdUp() {
		clearTimeout(debounce);
		setDebounce(setTimeout(() => {
			if (temp) {
				sendTo("setMute", { mic: mic, muted: longMuted })
				setTemp(false);
			}
		}, 100));
	}

	return <div className="fs-1">
		<MuteIndicator micMuted={micMuted} />
		<div className="mute-buttons gap-2 mb-2 d-flex flex-wrap mt-2">
			<Button variant="primary" onClick={sendToF("setMute", { mic: mic, muted: !longMuted })}>Mute Toggle</Button>
			<Button variant="outline-primary" onMouseDown={holdDown} onMouseUp={holdUp} onTouchStart={holdDown} onTouchEnd={holdUp}>Push to {longMuted ? "Talk" : "Mute"}</Button>
			<Button variant="outline-primary" disabled>Talkback</Button>
		</div>
	</div>
}

function TechMute() {
	const [channels,] = useReplicant<Channels>("channels", { dcas: {}, mics: {}, tech: -1, scenes: {} });
	const [techMuted,] = useReplicant<TechMuted>("techMuted", {});
	console.log(techMuted);

	if (techMuted === undefined) return <></>;
	function talkToggle(m: string) {
		const muted = techMuted && techMuted[m];
		console.log(muted);
		if (m === "MAIN" && muted) {
			// Confirm if trying to enable main
			if (!confirm("DANGER: Enable Voice of God?")) return;
		}
		sendTo("setTechMuted", { bus: m, muted: !muted });
	}

	if (!channels || !channels.buses) return <div>No active channels</div>;
	return <div>
		<h3>Tech Talk To</h3>
		<div className="gap-2 mb-2 d-flex flex-wrap fs-3">
			{Object.keys(channels.buses).map(m =>
				<Form.Check key={m} type="switch" className="d-inline-block ms-3" checked={!techMuted[m]}
					label={m} onChange={() => talkToggle(m)} />
			)}
		</div>
	</div >
}


function MutePanel() {
	const [status,] = useReplicant<XrStatus>("xrStatus", { "connection": "disconnected" });

	const [mic, setMic] = useState(fetchFromParams());
	useEffect(() => copyToParams(mic), [mic]);

	if (!status || status.connection === "disconnected" || status.connection === "connecting") return null;

	if (mic) {
		return <>
			{" "} Controlling {mic} <Button variant="link p-0 m-0" style={{ verticalAlign: "unset" }}
				onClick={(e) => { setMic(null); e.stopPropagation() }}>← Back to Selection</Button>
			<MuteControl mic={mic} />
			{mic === "TECH" && <TechMute />}
		</>
	} else {
		return <MicChoice setMic={(m) => setMic(m)} />
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

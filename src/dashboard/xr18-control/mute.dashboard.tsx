import './xr18.scss';

import { sendTo, sendToF } from 'common/listeners';
import { useEffect, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import { createRoot } from 'react-dom/client';
import { Channels, Configschema, Muted, XrStatus } from 'types/schemas';
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
		case true: return <Badge bg="success" className="mb-2">Connected</Badge>
		case false: return <Badge bg="danger" className="mb-2">Disconnected</Badge>
	}
	return null;
}

function MicChoice({ setMic }: { setMic: (m: string) => void }) {
	const [channels,] = useReplicant<Channels>("channels", { dcas: {}, mics: {}, tech: -1, scenes: {} });

	if (!channels || !channels.mics) return <>No active mics</>;
	return <div className="gap-2 mb-2 d-flex flex-wrap">
		{Object.keys(channels.mics).map(m => <Button variant="outline-primary" onClick={() => setMic(m)}>{m}</Button>)}
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

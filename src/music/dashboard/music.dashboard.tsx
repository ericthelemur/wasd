import '../../common/uwcs-bootstrap.css';
import { createRoot } from 'react-dom/client';


import { CreateCommPointConnect } from '../../common/commpoint/login';
import type { Replicants } from "../extension/foobar";
import listeners, { ListenerTypes, sendToF } from '../messages';
import { CurrentSong } from './song';
import { Status } from 'types/schemas/music';
import { Button } from 'react-bootstrap';
import { PauseFill, PlayFill } from 'react-bootstrap-icons';

function PlayPause({ status }: { status: Status }) {
	if (!status.connected) return <></>
	return <>
		<span className="ms-auto"></span>
		<Button onClick={sendToF(status.playing ? "pause" : "play", undefined)}>{status.playing ? <PauseFill /> : <PlayFill />}</Button>
		<div style={{ zoom: 0.7 }}>
			<CurrentSong />
		</div>
	</>
}

const ControlForm = CreateCommPointConnect<ListenerTypes, Replicants>("music", listeners, {
	address: "Foobar Address",
	username: "Foobar Username",
	password: "Foobar Password",
} as const, { address: "127.0.0.1:8880" }, { connected: "disconnected", playing: false }, PlayPause);

const root = createRoot(document.getElementById('root')!);
root.render(<ControlForm />);

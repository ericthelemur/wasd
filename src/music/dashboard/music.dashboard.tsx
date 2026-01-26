import '../../common/uwcs-bootstrap.css';
import { createRoot } from 'react-dom/client';


import { CreateCommPointConnect } from '../../common/commpoint/login';
import type { Replicants } from "../extension/foobar";
import listeners, { ListenerTypes, sendToF } from '../messages';
import { CurrentSong } from './song';
import { Status } from 'types/schemas/music';
import { Button, ButtonGroup } from 'react-bootstrap';
import { FastForwardFill, PauseFill, PlayFill } from 'react-bootstrap-icons';

function PlayPause({ status }: { status: Status }) {
	if (!status.connected) return <></>
	return <>
		{status.connected == "connected" && <ButtonGroup className="float-end mb-2">
			<Button onClick={sendToF(status.playing ? "pause" : "play", undefined)}>{status.playing ? <PauseFill /> : <PlayFill />}</Button>
			<Button variant="outline-primary" disabled={!status.playing} onClick={sendToF("skip", undefined)}>{<FastForwardFill />}</Button>
		</ButtonGroup >}
		<div style={{ zoom: 0.7 }} className={status.playing ? "" : "mb-5"}>
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

import '../../../common/uwcs-bootstrap.css';
import '../../dashboard/mixer-control/mixer.scss';

import { getNodeCG } from 'common/utils';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import { InputGroup } from 'react-bootstrap';
import { PauseFill } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { createRoot } from 'react-dom/client';
import { RunDataActiveRun, RunDataTeam, Timer } from 'speedcontrol-util/types/speedcontrol';
import { Channels, Muted, Status, TechMuted } from 'types/schemas/mixer';
import { useReplicant } from 'use-nodecg';

import { CommPointStatus } from '../../../common/commpoint/login';
import { formatTeamName } from '../../../common/utils/formats';
import { sendTo, sendToF } from '../../messages';

function fetchFromParams() {
	const url = new URL(window.location.href);
	var params = url.searchParams;
	const mic = params.get("mic");
	if (mic) return mic;

	// const cookieMic = await cookieStore.get("mic");
	const cookieMic = Cookies.get("mic");
	console.log(cookieMic);
	if (cookieMic) return cookieMic;

	const standalone = params.get("standalone");
	if (url.pathname.includes("external")) return null;
	if (!standalone || standalone != "true") return "TECH";
	return null;
}

function copyToParams(mic: string | null) {
	const url = new URL(window.location.href);
	var params = url.searchParams;
	// Object.entries(settings).filter(([k, v]) => v).forEach(([k, v]) => params.set(k, v.toString()));

	if (mic) {
		Cookies.set("mic", mic);
		params.set("mic", mic);
	} else {
		Cookies.remove("mic");
		params.delete("mic");
	}
	history.replaceState(null, "", url.href);
}

function MicChoice({ setMic }: { setMic: (m: string) => void }) {
	const [channels,] = useReplicant<Channels>("channels", { dcas: {}, mics: {}, tech: -1, scenes: {}, mutegroups: {} }, { namespace: "mixer" });

	if (!channels || !channels.mics) return <>No active mics</>;
	const url = new URL(window.location.href);
	return <div className="gap-2 mb-2 d-flex flex-wrap">
		{Object.keys(channels.mics).map(m => {
			if (m == "TECH" && url.pathname.includes("external")) return;
			return <Button key={m} variant="outline-primary" onClick={() => setMic(m)}>{m}</Button>
		})}
	</div>
}

function TimerButtons(props: { mic: string }) {
	const [run,] = useReplicant<RunDataActiveRun>("runDataActiveRun", { id: "", teams: [], customData: {} }, { namespace: "nodecg-speedcontrol" });
	const [timer,] = useReplicant<Timer>("timer", { time: "", state: "finished", milliseconds: 0, timestamp: 0, teamFinishTimes: {} }, { namespace: "nodecg-speedcontrol" });

	if (!run || !timer) return;
	if (!run.teams || run.teams.length == 0 || run.teams.length > 2) return;

	let team: RunDataTeam | undefined;
	if (run.customData.scene == "RUN-1" && props.mic == "RUN-1") team = run.teams[0];
	else if (run.customData.scene == "RUN-2" && props.mic == "RUN-2") team = run.teams[0];
	else if (run.customData.scene == "RUN-RACE") team = run.teams[props.mic == "RUN-1" ? 0 : 1];

	if (!team) return;
	const name = formatTeamName(team);
	const finishTime = team.id in timer.teamFinishTimes ? timer.teamFinishTimes[team.id].time : "";
	const time = timer.timestamp == 0 ? "" : (finishTime || timer.time);
	const running = timer?.state == "running" && !(team.id in timer.teamFinishTimes);

	function startStopTimer() {
		if (!running) {
			getNodeCG().sendMessageToBundle("timerStart", "nodecg-speedcontrol");
		} else {
			getNodeCG().sendMessageToBundle("timerStop", "nodecg-speedcontrol", { id: team!.id });
		}
	}

	return <>{run.customData.scene == "RUN-RACE" && `Controlling timer for ${name}`}
		<InputGroup style={{ marginBottom: "2em" }}>
			<Button variant={!running ? "primary" : "danger"} disabled={Boolean(finishTime)} style={{ flex: "1 1 0", textWrap: "nowrap", padding: "2rem" }} onClick={startStopTimer}>
				{!running ? "Start" : "Finish"} Run{time && ` (${time})`}
			</Button>
			{running && !finishTime && <Button variant="outline-primary" className="p-5" onClick={() => getNodeCG().sendMessageToBundle("timerPause", "nodecg-speedcontrol")}><PauseFill /></Button>}
		</InputGroup>
	</>
}

function MuteIndicator({ micMuted, talkback }: { micMuted: boolean | undefined, talkback: boolean | undefined }) {
	const classes = "mute-indicator p-4 d-block"
	if (micMuted === true && talkback === true) return <Badge bg="warning" className={classes}>TALKBACK</Badge>
	else if (micMuted === false) return <Badge bg="success" className={classes}>LIVE</Badge>
	else if (micMuted === true) return <Badge bg="danger" className={classes}>MUTED</Badge>
	else return <Badge bg="warning" className={classes}>UNKNOWN</Badge>
}

function MuteControl({ mic }: { mic: string }) {
	const [muted,] = useReplicant<Muted>("muted", {}, { namespace: "mixer" });
	const [held, setHeld] = useState(false);
	const [wasMuted, setWasMuted] = useState<boolean | undefined>(undefined);
	const [debounce, setDebounce] = useState<NodeJS.Timeout | undefined>(undefined);

	const micMuted = (muted ? muted[mic]?.muted : false);
	const micTalkback = (muted ? muted[mic]?.soloed : undefined);

	function holdDown() {
		sendTo("setMute", { mic: mic, muted: !micMuted });
		setWasMuted(micMuted);
		setHeld(true);
	}
	function holdUp() {
		clearTimeout(debounce);
		setDebounce(setTimeout(() => {
			if (held) {
				sendTo("setMute", { mic: mic, muted: Boolean(wasMuted) });
				setWasMuted(undefined);
				setHeld(false);
			}
		}, 100));
	}
	function talkToggle() {
		if (!micTalkback) {  // Enable
			setWasMuted(micMuted);
			sendTo("setTalkback", { mic: mic, talkback: !micTalkback });
		} else { 	// Disable
			sendTo("setTalkback", { mic: mic, talkback: !micTalkback, muted: wasMuted });
			setWasMuted(undefined);
		}
	}

	return <div className="fs-1">
		<MuteIndicator micMuted={micMuted} talkback={micTalkback} />
		<div className="mute-buttons gap-2 mb-2 d-flex flex-wrap mt-2">
			<Button variant="primary" onClick={sendToF("setMute", { mic: mic, muted: !micMuted })}>Mute Toggle</Button>
			<Button variant="outline-primary" onMouseDown={holdDown} onMouseUp={holdUp} onTouchStart={holdDown} onTouchEnd={holdUp}>
				Push to {(wasMuted ?? micMuted) ? "Talk" : "Mute"}</Button>
			{mic != "TECH" && <Button variant="outline-primary" onClick={talkToggle}>Talkback Toggle</Button>}
		</div>
	</div>
}

function TechMute() {
	const [channels,] = useReplicant<Channels>("channels", { dcas: {}, mics: {}, tech: -1, scenes: {}, mutegroups: {} }, { namespace: "mixer" });
	const [techMuted,] = useReplicant<TechMuted>("techMuted", {}, { namespace: "mixer" });

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
		{techMuted["MAIN"] === false ? <Badge bg="danger" className="fs-3 mb-2">VOICE OF GOD ACTIVE</Badge>
			: <h3>Tech Talk To</h3>
		}
		<div className="gap-2 mb-2 d-flex flex-wrap fs-3">
			{Object.keys(channels.buses).map(m =>
				<Form.Check key={m} type="switch" className="d-inline-block ms-3" checked={!techMuted[m]}
					label={m} onChange={() => talkToggle(m)} />
			)}
		</div>
	</div >
}


function MutePanel() {
	const [status,] = useReplicant<Status>("status", { "connected": "disconnected" }, { namespace: "mixer" });

	const [mic, setMic] = useState(fetchFromParams());
	useEffect(() => {
		copyToParams(mic);
		document.title = mic ? `${mic} | MUTE` : "MUTE";
	}, [mic]);

	if (!status || status.connected != "connected") return null;

	if (mic) {
		return <>
			{" "} Controlling {mic} <Button variant="link p-0 m-0" style={{ verticalAlign: "unset" }}
				onClick={(e) => { setMic(null); e.stopPropagation() }}>← Back to Selection</Button><br />
			{(mic == "RUN-1" || mic == "RUN-2") && <TimerButtons mic={mic} />}
			<MuteControl mic={mic} />
			{mic === "TECH" && <TechMute />}
		</>
	} else {
		return <MicChoice setMic={(m) => setMic(m)} />
	}
}

export function MuteControlPanel() {
	return <div className="m-3">
		<CommPointStatus bundle="mixer" />
		<MutePanel />
	</div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<MuteControlPanel />);

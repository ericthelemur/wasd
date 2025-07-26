import '../../../common/uwcs-bootstrap.css';

import clone from 'clone';
import { msToTimeString } from 'countdown/utils';
import { FormEvent, useState } from 'react';
import {
    ArrowCounterclockwise, BrushFill, Controller, PlayFill, RecordFill, Wifi
} from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { createRoot } from 'react-dom/client';
import { RunData, RunDataActiveRun, RunDataArray } from 'speedcontrol-util/types/speedcontrol';
import { RunDataActiveRunSurrounding } from 'speedcontrol-util/types/speedcontrol/schemas';
import { Timer } from 'speedcontrol-util/types/speedcontrol/schemas/timer';
import {
    ConnStatus, Countdown, ObsStatus, PreviewScene, ProgramScene, StreamState, XrStatus
} from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import { sendTo as sendToCountdown } from '../../../countdown/messages';
import { sendTo as sendToOBS } from '../../../obs/messages';

import type NodeCG from '@nodecg/types';
declare const nodecg: NodeCG.ServerAPI;

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
    const [status,] = useReplicant<ObsStatus>("obsStatus", { "connection": "disconnected", "streaming": false, "recording": false, "studioMode": false, "transitioning": false, "moveCams": false, "controlRecording": false });

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


function findRunType(programScene: ProgramScene | undefined, runDataArray: RunDataArray | undefined, runDataActiveRunSurrounding: RunDataActiveRunSurrounding | undefined, current = true) {
    // Pull run type from OBS first (if getting current), then from run customData
    if (current && programScene && programScene.name) {
        if (programScene.name.endsWith("-1")) return "1";
        else if (programScene.name.endsWith("-2")) return "2";
        else if (programScene.name.endsWith("-RACE")) return "RACE";
    }

    if (runDataArray && runDataActiveRunSurrounding) {
        const runId = current ? runDataActiveRunSurrounding.current : runDataActiveRunSurrounding.next;
        const run = runDataArray && runDataArray.find(r => r.id === runId);
        if (run && run.customData.scene) {
            if (run.customData.scene.endsWith("-1")) return "1";
            else if (run.customData.scene.endsWith("-2")) return "2";
            else if (run.customData.scene.endsWith("-RACE")) return "RACE";
        }
    }
    return undefined;
}


function MainControls() {
    const [lastScene, setLastScene] = useState("");
    const [showReassignment, setReassignment] = useState(false);
    const [programScene,] = useReplicant<ProgramScene>("programScene", null);
    const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });
    const [obsStatus,] = useReplicant<ObsStatus>("obsStatus", { connection: "disconnected", "recording": false, "streaming": false, transitioning: false, studioMode: true, moveCams: true, controlRecording: false });
    const [runDataArray,] = useReplicant<RunDataArray>("runDataArray", [], { namespace: "nodecg-speedcontrol" });
    const [runDataActiveRunSurrounding,] = useReplicant<RunDataActiveRunSurrounding>("runDataActiveRunSurrounding", { previous: undefined, current: undefined, next: undefined }, { namespace: "nodecg-speedcontrol" });
    const [run,] = useReplicant<RunDataActiveRun>("runDataActiveRun", { id: "", teams: [], customData: {} }, { namespace: "nodecg-speedcontrol" });

    if (!state || !obsStatus) return null;

    function goToScene(newSceneName: string) {
        if (programScene) setLastScene(programScene.name);
        if (obsStatus?.studioMode) {

        } else {
            sendToOBS("transition", { sceneName: newSceneName });
        }
    }

    function setRunType(runType: string | null, run: RunData | undefined) {
        if (!run) return;
        if (run.customData.scene && !confirm(`Set run type to ${runType}`)) return;
        setReassignment(false);

        let newData = clone(run);
        newData.customData.scene = runType ? `RUN-${runType}` : "";
        nodecg.sendMessageToBundle("modifyRun", "nodecg-speedcontrol", { runData: newData, updateTwitch: false })
    }

    const args = {
        lastScene, goToScene, programScene: programScene?.name || "", controlRecording: obsStatus.controlRecording,
        currentType: findRunType(programScene, runDataArray, runDataActiveRunSurrounding, true),
        nextType: findRunType(programScene, runDataArray, runDataActiveRunSurrounding, false),
    }

    return <>
        <Stack direction="horizontal" gap={1}>
            <b>RUN:</b>
            <Badge bg={args.currentType ? "success" : "danger"} onClick={() => setReassignment(!showReassignment)} style={{ cursor: "pointer" }}><Controller /> RUN-{args.currentType || "UNKNOWN"}</Badge>
            <Badge bg="info">Next: {args.nextType || "UNKNOWN"}</Badge>
        </Stack>

        {args.currentType || state.state == "BREAK" ?
            <Tabs id="main-state-tabs" activeKey={state.state} onSelect={s => s && setState({ ...state, state: s } as StreamState)}>
                <Tab eventKey="BREAK" title="BREAK"><BreakControls {...args} /></Tab>
                <Tab eventKey="INTRO" title="INTRO"><IntroControls {...args} /></Tab>
                <Tab eventKey="RUN" title="RUN"><RunControls {...args} /></Tab>
                <Tab eventKey="OUTRO" title="OUTRO"><OutroControls {...args} /></Tab>
            </Tabs>
            : <UnknownControls {...args} />}

        {(showReassignment || !args.currentType) && <InputGroup className="d-flex">
            <InputGroup.Text>Set:</InputGroup.Text>
            <Button className="flex-grow-1" variant="outline-primary" onClick={() => setRunType("1", run)}>RUN-1</Button>
            <Button className="flex-grow-1" variant="outline-primary" onClick={() => setRunType("2", run)}>RUN-2</Button>
            <Button className="flex-grow-1" variant="outline-primary" onClick={() => setRunType("RACE", run)}>RACE</Button>
            <Button className="flex-grow-1" variant="outline-primary" onClick={() => setRunType(null, run)}>Unset</Button>
        </InputGroup>}

    </>
}

interface ControlPage {
    lastScene: string;
    goToScene: (newSceneName: string) => void;
    programScene: string;
    controlRecording: boolean;
    currentType?: string;
    nextType?: string;
}


function ToBreakButton({ goToScene, programScene, controlRecording }: ControlPage) {
    const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });
    const [obsStatus,] = useReplicant<ObsStatus>("obsStatus", { connection: "disconnected", "recording": false, "streaming": false, transitioning: false, studioMode: true, moveCams: true, controlRecording: false });
    const [runDataArray,] = useReplicant<RunDataArray>("runDataArray", [], { namespace: "nodecg-speedcontrol" });
    const [runDataActiveRunSurrounding,] = useReplicant<RunDataActiveRunSurrounding>("runDataActiveRunSurrounding", { previous: undefined, current: undefined, next: undefined }, { namespace: "nodecg-speedcontrol" });

    const isRecording = controlRecording && obsStatus?.connection == "connected" && obsStatus?.recording;
    return <Button onClick={() => {
        isRecording && sendToOBS("stopRecording");
        setState({ ...state, state: "BREAK" });
        goToScene("BREAK");
        // Update Twitch title when going to break, so we are in the right category
        if (runDataActiveRunSurrounding && runDataActiveRunSurrounding.next) {
            const runId = runDataActiveRunSurrounding.next;
            const run = runDataArray && runDataArray.find(r => r.id === runId);
            if (run) nodecg.sendMessageToBundle("modifyRun", "nodecg-speedcontrol", { runData: run, updateTwitch: true })
        }
    }}>BREAK Phase (Scene BREAK{isRecording && "; Rec stop"}; Twitch Title)</Button>
}

function UnknownControls(args: ControlPage) {
    const { goToScene, programScene, controlRecording } = args;
    const [run,] = useReplicant<RunDataActiveRun>("runDataActiveRun", { id: "", teams: [], customData: {} }, { namespace: "nodecg-speedcontrol" });


    return <div className="vstack gap-2">
        <Button variant="outline-primary" onClick={() => goToScene(programScene == "BREAK" ? "COMMS" : "BREAK")}>{programScene == "BREAK" ? "Scene COMMS" : "Scene BREAK"}</Button>
        <ToBreakButton {...args} />
    </div>
}


function CountdownRow() {
    const [countdown,] = useReplicant<Countdown>("countdown", { "value": 0, "state": "paused" });
    if (!countdown) return null;

    function playPauseCountdown(e: FormEvent) {
        e.preventDefault();
        if (countdown!.state == "ended") sendToCountdown("countdown.start");
        else if (countdown!.state == "running") sendToCountdown("countdown.pause");
        else if (countdown!.state == "paused") sendToCountdown("countdown.unpause");
    }

    const going = countdown.state == "running";
    return <InputGroup className="d-flex">
        <Button className="flex-grow-1" variant={going ? "outline-primary" : "primary"} onClick={playPauseCountdown}>{going ? "Pause" : "Play"} Countdown</Button>
        <InputGroup.Text className={going ? "text-danger" : ""}>{msToTimeString(countdown.value)}</InputGroup.Text>
        <Button variant="outline-primary" style={{ flexGrow: 0 }} onClick={(e) => { e.preventDefault(); sendToCountdown("countdown.add", 60 * 1000); }}>+1m</Button>
        <Button variant="outline-primary" style={{ flexGrow: 0 }} onClick={(e) => { e.preventDefault(); sendToCountdown("countdown.reset"); }}><ArrowCounterclockwise /></Button>
    </InputGroup>
}

function BreakControls({ goToScene, programScene, controlRecording }: ControlPage) {
    const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });
    const [obsStatus,] = useReplicant<ObsStatus>("obsStatus", { connection: "disconnected", "recording": false, "streaming": false, transitioning: false, studioMode: true, moveCams: true, controlRecording: false });

    return <div className="vstack gap-2">
        <CountdownRow />
        {/* <Button variant="outline-primary" onClick={() => nodecg.sendMessageToBundle("twitchStartCommercial", "nodecg-speedcontrol", { duration: 180 })}>Run 1:30 ads (no prerolls for 1hr)</Button> */}
        <Button variant="outline-primary" onClick={() => goToScene(programScene == "BREAK" ? "COMMS" : "BREAK")}>{programScene == "BREAK" ? "Scene COMMS" : "Back to BREAK"}</Button>
        <Button onClick={() => {
            setState({ ...state, state: "INTRO" });
            goToScene("COMMS");
            nodecg.sendMessageToBundle("changeToNextRun", "nodecg-speedcontrol");
        }}
        >Intro Phase (Scene COMMS{controlRecording && "; Rec start"})</Button>
    </div>
}


function IntroControls({ lastScene, goToScene, programScene, controlRecording, currentType: t }: ControlPage) {
    const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });
    const [obsStatus,] = useReplicant<ObsStatus>("obsStatus", { connection: "disconnected", "recording": false, "streaming": false, transitioning: false, studioMode: true, moveCams: true, controlRecording: false });

    return <div className="vstack gap-2">
        <Button disabled={programScene == "COMMS"} variant="outline-primary" onClick={() => goToScene("COMMS")}>Scene COMMS (no runner)</Button>
        <Button disabled={programScene == `COMMS-${t}`} onClick={() => goToScene(`COMMS-${t}`)}>Scene COMMS-{t} (no game)</Button>
        <Button variant="primary" onClick={() => { setState({ ...state, state: "RUN" }); goToScene(`RUN-${t}`); }}>RUN Phase (Scene RUN-{t})</Button>
        <Button variant="outline-primary" onClick={() => { setState({ ...state, state: "BREAK" }); goToScene("BREAK"); }}>Back to BREAK Phase (Scene BREAK{controlRecording && "; Rec stop"})</Button>
    </div>
}

function OutroControls(args: ControlPage) {
    const { lastScene, goToScene, programScene, controlRecording, currentType: t } = args;
    const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });

    return <div className="vstack gap-2">
        <Button disabled={programScene == `COMMS-${t}`} onClick={() => goToScene(`COMMS-${t}`)}>Scene COMMS-{t} (no game)</Button>
        <Button disabled={programScene == "COMMS"} variant="outline-primary" onClick={() => goToScene("COMMS")}>Scene COMMS (no runner)</Button>
        <ToBreakButton {...args} />
        <Button variant="outline-primary" onClick={() => { setState({ ...state, state: "RUN" }); goToScene(`RUN-${t}`) }}>Back to RUN Phase (Scene RUN-{t})</Button>
    </div>
}


function TimerButton() {
    const [run,] = useReplicant<RunDataActiveRun>("runDataActiveRun", { id: "", teams: [], customData: {} }, { namespace: "nodecg-speedcontrol" });
    const [timer,] = useReplicant<Timer>("timer", { time: "", state: "finished", milliseconds: 0, timestamp: 0, teamFinishTimes: {} }, { namespace: "nodecg-speedcontrol" });

    if (!run) return <Button disabled={true} />
    if (run.teams.length == 0) return <Button disabled={true}>No Teams</Button>;
    if (run.teams.length > 1) return <Button disabled={true}>Use Timer Control</Button>;
    return <Button onClick={() => {
        if (timer?.state != "running") {
            nodecg.sendMessageToBundle("timerStart", "nodecg-speedcontrol");
        } else {
            nodecg.sendMessageToBundle("timerStop", "nodecg-speedcontrol", { id: run.teams[0].id });
        }
    }}>
        {timer?.state != "running" ? "Start" : "Stop"} Run Timer</Button>
}

function RunControls({ lastScene, goToScene, programScene, currentType: t }: ControlPage) {
    const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK", "minsBehind": 0 });

    return <div className="vstack gap-2">
        <TimerButton />
        <Button disabled={programScene == `RUN-${t}`} onClick={() => { goToScene(`RUN-${t}`) }}>Scene RUN-{t}</Button>
        <Button disabled={programScene == `COMMS-${t}`} variant="outline-primary" onClick={() => { goToScene(`COMMS-${t}`) }}>Scene COMMS-{t}</Button>
        <Button disabled={programScene == "COMMS"} variant="outline-primary" onClick={() => { goToScene("COMMS") }}>Scene COMMS</Button>
        <Button onClick={() => { setState({ ...state, state: "OUTRO" }); goToScene(`COMMS-${t}`); }}>State OUTRO (Scene COMMS-{t})</Button>
    </div>
}


function MainForm() {
    const [obsStatus,] = useReplicant<ObsStatus>("obsStatus", { connection: "disconnected", "recording": false, "streaming": false, transitioning: false, studioMode: true, moveCams: true, controlRecording: false });

    return <div className="m-3 vstack gap-3">
        <AllStatuses />
        {obsStatus?.connection == "connected" && <MainControls />}
    </div>
}


const root = createRoot(document.getElementById('root')!);
root.render(<MainForm />);

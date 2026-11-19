import '../../common/uwcs-bootstrap.css';
import './splits.dashboard.css';

import { getNodeCG } from 'common/utils';
import { formatTeamName } from 'common/utils/formats';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { ArrowCounterclockwise, TrashFill, X } from 'react-bootstrap-icons';
import Container from 'react-bootstrap/Container';
import FormControl from 'react-bootstrap/FormControl';
import { createRoot } from 'react-dom/client';
import { RunData, RunDataActiveRun } from 'speedcontrol-util/types/speedcontrol';
import { Split, Splits } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import { sendToF } from '../messages';

function SplitsUpload({setSplits}: {setSplits: (s: Splits) => any}) {
    function fileChange(e: React.ChangeEvent<HTMLInputElement>) {
        // On file upload, parse XML and extract splits

        if (!e.target.files || e.target.files.length != 1) return;
        const file = e.target.files[0];

        const reader = new FileReader();

        reader.onerror = () => {
            console.error('Failed to read the selected file.');
        };

        // Use file reader to read file (probably unnecessary tbh)
        reader.onload = (e: ProgressEvent<FileReader>) => {
            const text = e.target?.result;
            if (typeof text !== 'string') return;

            // Parse XML
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'application/xml');

            // Check for error response
            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                console.error(`XML Parsing Error: ${parserError.textContent || 'Malformed XML'}`);
                return;
            }

            // Extract segments using querySelector
            const segmentNodes = Array.from(doc.querySelectorAll('Run > Segments > Segment'));
            const splits = segmentNodes.map((seg, i) => {
                const name = seg.querySelector(':scope > Name')?.textContent?.trim() || `Split ${i}/${segmentNodes.length}`;
                const timeNode = seg.querySelector(':scope > SplitTimes > SplitTime[name="Personal Best"] > RealTime');
                const time = timeNode?.textContent?.trim();
                return { name, time };
            });
            // Remove missing times & set last as end
            let filtered = splits.filter(s => s.time) as {name: string, time: string}[];
            if (filtered.length == 0) {     // If no times, equally space splits
                filtered = splits.map((s, i) => ({ name: s.name, time: `00:${String(i).padStart(2, "0")}:00` }));
            }
            const endTime = filtered[filtered.length-1].time;

            // Add progress (0-1 depending on fraction through time)
            const endDurationMS = moment.duration(endTime).asMilliseconds();
            const withProgress = filtered.map(s => {
                const time = moment.duration(s.time).asMilliseconds();
                return { 
                    name: s.name, 
                    time: moment.utc(time).format('HH:mm:ss'), 
                    milliseconds: time,
                    progress: time / endDurationMS,
                    times: {}
                };
            });

            setSplits({ end: endTime, splits: withProgress, current: {} });
        }
        reader.readAsText(file);
    }

    return <Form>
        <Form.Group controlId="splitFile">
            <Form.Label>Upload Livesplit .lss</Form.Label>
            <Form.Control type="file" accept='.lss,.xml,text/xml,application/xml' onChange={fileChange} />
        </Form.Group>
    </Form>
}

function SplitsView({splits, setSplits}: {splits: Splits, setSplits: (s: Splits) => any}) {
    const [run,] = useReplicant<RunDataActiveRun>("runDataActiveRun", { id: "", teams: [], customData: {} }, { namespace: "nodecg-speedcontrol" });
    if (!run || !splits) return;
    console.log(run.teams);
    const inIframe = window.self !== window.top;

    return <>
        <Button variant="danger float-end" onClick={() => confirm("Clear Splits?") && setSplits(null)}><TrashFill /></Button>
        <h2>Splits for {run.game}</h2>
        <SplitButtons splits={splits} run={run} />
        <ol style={inIframe ? {maxHeight: "20em", overflowX: "auto"} : {}}>{splits.splits.map(s => 
            <li>
                <SplitDisplay split={s} run={run} />
            </li>
        )}</ol>
    </>
}

function SplitButtons({run, splits} : {run : RunData, splits: Splits}) {
    if (!splits) return;

    return <div className="vstack mt-3 gap-2">
        {run.teams.map((t) => {
            const started = splits.current[t.id] != 0;
            const ended = splits.current[t.id] >= splits.splits.length;
            return <div className="btn-group flex-grow-1 display-block" role="group" key={t.id}>
                <Button className='flex-grow-1' variant='primary' onClick={sendToF("split", {teamId: t.id, forfeit: false})} disabled={ended}>
                    Split  {run.teams.length > 1 && <>for {formatTeamName(t)}</>}{ended && <small><br />{splits.splits[splits.current[t.id] || 0]?.name}</small>}
                </Button>
                <Button className='flex-grow-0' variant='outline-secondary' onClick={sendToF("split", {teamId: t.id, forfeit: true})} disabled={ended}><X /></Button>
                <Button className='flex-grow-0' variant='outline-danger' onClick={sendToF("undo", {teamId: t.id})} disabled={!started}><ArrowCounterclockwise /></Button>
            </div>
        })}
    </div>
}

function SplitDisplay({run, split}: {run : RunData, split: Split}) {
    console.log(split.name, Object.entries(split.times).filter(([_, time]) => time.state == "completed"));
    return <>
        <span style={{font: "mono"}}>{split.time}</span> {split.name} <i>({Math.round(split.progress * 100)}%)</i>
        {Object.keys(split.times).length != 0 && <ul>
            {Object.entries(split.times).filter(([_, time]) => time.state == "completed")
                .map(([teamId, time]) => {
                    console.log("TIME", split.name, teamId, time);
                    const team = run.teams.find((team) => team.id == teamId);
                    return <li>{team ? formatTeamName(team) : "Unknown Team"}: {time.time}</li>
                })}
        </ul>}
    </>
}

export function SplitsComp() {
    const [splits, setSplits] = useReplicant<Splits>("splits", null, { namespace: "livesplit" });
    return <div className="m-3">
        {splits ? <SplitsView splits={splits!} setSplits={setSplits} />
                : <SplitsUpload setSplits={setSplits} />}
    </div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<SplitsComp />);
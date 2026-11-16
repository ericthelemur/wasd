import '../../common/uwcs-bootstrap.css';
import './splits.dashboard.css';

import { getNodeCG } from 'common/utils';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { Trash, TrashFill } from 'react-bootstrap-icons';
import Container from 'react-bootstrap/Container';
import FormControl from 'react-bootstrap/FormControl';
import { createRoot } from 'react-dom/client';
import { RunDataActiveRun } from 'speedcontrol-util/types/speedcontrol';
import { Splits } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

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
                return { name: s.name, time: moment.utc(time).format('HH:mm:ss'), progress: time / endDurationMS };
            });

            setSplits({ end: endTime, splits: withProgress });
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
    return <>
        <Button variant="danger float-end" onClick={() => confirm("Clear Splits?") && setSplits(null)}><TrashFill /></Button>
        <h2>Splits for {run.game}</h2>
        <ol>{splits.splits.map(s => 
            <li><span style={{font: "mono"}}>{s.time}</span> {s.name} <i>({Math.round(s.progress * 100)}%)</i></li>
        )}</ol>
    </>
}

export function SplitsComp() {
    const [splits, setSplits] = useReplicant<Splits>("splits", null, { namespace: "livesplit" });
    return <div className="m-3" style={{maxHeight: "20em", overflowX: "auto"}}>
        {splits ? <SplitsView splits={splits!} setSplits={setSplits} />
                : <SplitsUpload setSplits={setSplits} />}
    </div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<SplitsComp />);
// import 'nodecg-dono-control/src/dashboard/reader/reader.graphic.css';
import { msToApproxTimeString } from '../../../../countdown/utils';
import './slides.scss';

import Card from 'react-bootstrap/Card';
import { Textfit } from 'react-textfit';
import { RunData } from 'speedcontrol-util/types/speedcontrol';
import { StreamState } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
import { formatTime } from 'common/utils/formats';


export function RunTime({ run, minsBehind, delay }: { run: RunData, minsBehind?: number, delay?: boolean }) {
    const date = new Date(run.scheduledS! * 1000);

    if (delay && minsBehind) {
        const lateDate = new Date(run.scheduledS! * 1000 + (minsBehind ?? 0) * 60 * 1000);
        return <>{<span className="text-decoration-line-through">{formatTime(date)}</span>} ~{formatTime(lateDate)}</>;
    } else {
        return <>{formatTime(date)}</>;
    }
}


export function RunCard({ run, delay, isNext }: { run: RunData, delay?: boolean, isNext?: boolean }) {
    const [state,] = useReplicant<StreamState>("streamState", { "state": "BREAK" });
    if (!run || !state) return null;

    const runners = run.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. ");
    const info = [runners, msToApproxTimeString((run.estimateS || 0) * 1000), run.category, run.system, run.release].filter(v => v);

    return <Card key={run.id}>
        <Card.Body className='p-2'>
            <div className="game">
                <h2 className="fw-medium">
                    <Textfit mode="single" max={50}>
                        <span className="fw-bold">{run.game}</span>
                        {!isNext && <>{" at "}<span className="fw-bold"><RunTime run={run} minsBehind={state.minsBehind} delay={delay} /></span></>}
                    </Textfit>
                    <Textfit mode="single" max={55}>
                        <div style={{ marginTop: 3, fontSize: "0.6em", lineHeight: 1, opacity: run.category ? 1 : 0 }}>{info.join(" / ")}</div>
                    </Textfit>
                </h2>
            </div>
        </Card.Body>
    </Card>
}
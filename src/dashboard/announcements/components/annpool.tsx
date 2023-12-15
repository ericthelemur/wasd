import './announcement.scss';

import { Draggable, DraggableProvided, Droppable } from 'react-beautiful-dnd';
import { AnnPool, AnnRef, Announcement } from 'types/schemas';

import { CSSTransition, TransitionGroup } from 'react-transition-group';
import add from '../../assets/add.svg';
import Editable from "./editable";
import { AnnouncementComp, AnnouncementError, InsertHandle } from './announcement';
import { sendTo, sendToF } from "common/listeners";
import { DnDTransitionsList } from './dndlist';

export interface AnnPoolProps {
    id: string;
    pool: AnnPool;
    contents: Announcement[];
    prelude?: Announcement[];
    preludeRefs?: AnnRef[];
}

function PoolTitle(props: AnnPoolProps) {
    const { pool } = props;
    return (<h3 className="m-1 d-flex gap-2">
        <Editable text={pool.name} className="flex-grow-1"
            setText={(v) => pool.name = v} />
        <Editable type="number" className='priority'
            text={pool.priority.toString()} setText={v => pool.priority = Number(v)} />
    </h3>)
}

function makeID(queue: boolean) {
    return (r: AnnRef) => `${queue ? "queue-" : ""}${r.id}${r.time ? `-${r.time}` : ""}`
}

export function AnnPoolComp(props: AnnPoolProps) {
    const { id: pid, pool } = props;
    const queue = pid === "queue";

    // Construct list with prelude -- simulates a freeze of queue in ui
    var refs, data;
    if (queue) {
        const prelude = props.prelude || [];
        const n = pool.announcements.length;
        refs = [...(props.preludeRefs || []), ...pool.announcements].slice(0, n);
        data = [...prelude, ...props.contents].slice(0, n);
    } else {
        refs = pool.announcements;
        data = props.contents;
    }

    return (
        <div className={"card my-1" + (pool.priority === 0 && !queue ? " opacity-50" : "")}>
            <div className="card-body">
                {!queue && <PoolTitle {...props} />}
                <DnDTransitionsList id={pid}
                    ids={refs.map(makeID(queue))}
                    data={data}
                    content={(id, index, ann, provided) => {
                        const ref = pool.announcements[index];
                        return <AnnouncementComp id={ref} pid={pid} announcement={ann} provided={provided}
                            queue={queue} strike={index < (props.prelude?.length || 0)} />
                    }} />
                <div className="position-relative mt-2">
                    <InsertHandle pid={pid} before={null} />
                </div>
            </div>
        </div>
    )
}
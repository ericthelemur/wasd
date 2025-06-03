import './pool.scss';

import { Droppable } from 'react-beautiful-dnd';
import { ThreeDots } from 'react-bootstrap-icons';
import Accordion from 'react-bootstrap/Accordion';
import { Message, MsgRef, Pool } from 'types/schemas';

import { DnDTransitionsList } from '../../../../common/components/dndlist';
import Editable from '../../../../common/components/editable';
import { InsertHandle, QueueMsg } from './msgqueue';

import type { PreludeInfo } from '../tickercontrol.dashboard';
export interface PoolProps {
    id: string;
    pool: Pool;
    contents: Message[];
    prelude?: Message[];
    preludeInfo?: PreludeInfo;
}

function PoolTitle(props: PoolProps) {
    const { pool } = props;
    return (<h3 className="m-1 d-flex gap-2">
        <Editable text={pool.name} className="flex-grow-1"
            setText={(v) => pool.name = v} />
        <Editable type="number" className='priority'
            text={pool.priority.toString()} setText={v => pool.priority = Number(v)} />
    </h3>)
}

function makeID(queue: boolean) {
    return (r: MsgRef) => `${queue ? "queue-" : ""}${r.id}${r.time ? `-${r.time}` : ""}`
}

export function PoolComp(props: PoolProps) {
    const { id: pid, pool, prelude, preludeInfo } = props;
    const queue = pid === "queue";

    // Construct list with prelude -- simulates a freeze of queue in ui
    const prel = prelude?.length || 0;
    var refs, data;
    if (prelude && preludeInfo && prel > 0) {
        const preludeList = prelude || [];
        const n = preludeInfo.length;

        const lastPrelude = preludeInfo.prelude[preludeInfo.prelude.length - 1];
        const dup = lastPrelude.id === pool.msgs[0].id && lastPrelude.time === pool.msgs[0].time;
        const pl = dup ? preludeInfo.prelude.slice(0, -1) : preludeInfo.prelude;
        const dl = dup ? preludeList.slice(0, -1) : preludeList;

        refs = [...pl, ...pool.msgs].slice(0, n);
        data = [...dl, ...props.contents].slice(0, n);
        console.log(n, refs.map(makeID(true)).join(", "));
    } else {
        refs = pool.msgs;
        data = props.contents;
    }

    const body = <>
        <DnDTransitionsList id={pid}
            ids={refs.map(makeID(queue))}
            data={data}
            content={(index, id, msg, provided) => {
                const ref = pool.msgs[index - prel];
                return <QueueMsg id={ref} pid={pid} message={msg} provided={provided}
                    queue={queue} strike={index < prel} />
            }} />
        <div className="position-relative mt-2">
            <InsertHandle pid={pid} before={null} />
        </div>
        {prel > 0 && <ThreeDots className="d-block m-auto" />}
    </>

    if (queue) {
        return <div className="card my-1">
            <div className="card-body">
                {body}
            </div>
        </div>

    } else {
        return (
            <Accordion.Item eventKey={pid} className={(pool.priority === 0 && !queue ? " opacity-50" : "")}>

                {!queue && <Droppable droppableId={`title-${pid}`}>
                    {(provided) => (<>
                        <Accordion.Header {...provided.droppableProps} ref={provided.innerRef}>
                            <h2 className="accordion-header m-1 d-flex flex-grow-1 gap-2 me-3 justify-content-between" >
                                {pid != "archive" ? <>
                                    <Editable text={pool.name} setText={(v) => pool.name = v} container={true} />
                                    <Editable type="number" className='priority' text={pool.priority.toString()} setText={v => pool.priority = Number(v)} container={true} />
                                </> : pool.name
                                }
                            </h2>
                        </Accordion.Header>
                        {provided.placeholder}
                    </>)}
                </Droppable>
                }
                <Accordion.Body>
                    {body}
                </Accordion.Body>
            </Accordion.Item>
        )
    }
}
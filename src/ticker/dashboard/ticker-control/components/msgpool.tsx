import './pool.scss';

import { ThreeDots } from 'react-bootstrap-icons';
import { Message, MsgRef, Pool } from 'types/schemas';
import { DnDTransitionsList } from 'wasd-common/shared/components/dndlist';
import Editable from 'wasd-common/shared/components/editable';

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

    return (
        <div className={"card my-1" + (pool.priority === 0 && !queue ? " opacity-50" : "")}>
            <div className="card-body">
                {!queue && <PoolTitle {...props} />}
                <DnDTransitionsList id={pid}
                    ids={refs.map(makeID(queue))}
                    data={data}
                    content={(id, index, msg, provided) => {
                        const ref = pool.msgs[index - prel];
                        return <QueueMsg id={ref} pid={pid} message={msg} provided={provided}
                            queue={queue} strike={index < prel} />
                    }} />
                <div className="position-relative mt-2">
                    <InsertHandle pid={pid} before={null} />
                </div>
                {prel > 0 && <ThreeDots className="d-block m-auto" />}
            </div>
        </div>
    )
}
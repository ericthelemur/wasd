import './announcement.scss';

import { Draggable, DraggableProvided, Droppable } from 'react-beautiful-dnd';
import { AnnPool, AnnRef, Announcement } from 'types/schemas';

import { CSSTransition, TransitionGroup } from 'react-transition-group';
import add from '../../assets/add.svg';
import Editable from "./editable";
import { AnnouncementComp, AnnouncementError } from './announcement';
import { sendToF } from "common/listeners";

export interface AnnPoolProps {
    id: string;
    pool: AnnPool;
    contents: Announcement[];
    unlink?: (id: string, index: number, pool: AnnPool) => void;
    skipTo?: (index: number, id: string, ann: Announcement) => void;
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

function InsertHandle(props: { pid: string; after: AnnRef | null; }) {
    return (
        <div className="addBtn" onClick={sendToF("addAnnouncement", props)}>
            <img className="addIcon" src={add} />
        </div>
    )
}


export function AnnPoolComp(props: AnnPoolProps) {
    const { id, pool } = props;
    const queue = id === "queue";

    const unlink = props.unlink ? (ref: AnnRef, index: number, text: string) => {
        if (confirm("Unlink queued announcement from source?\n" + text))
            props.unlink!(ref.id, index, pool);
    } : undefined;


    function wrap(id: string, index: number, content: (provided: DraggableProvided) => JSX.Element) {
        return <CSSTransition timeout={500} key={id} classNames="item">
            <Draggable key={id} draggableId={id} index={index}>
                {content}
            </Draggable>
        </CSSTransition>
    }

    function AnnWrapper(ann: Announcement, index: number) {
        const ref = pool.announcements[index];
        if (ref === undefined || ann === undefined) {
            return wrap(`err-${index}`, index, provided =>
                <AnnouncementError id={ref} pid={id} index={index} provided={provided}
                    msg={ref === undefined ? `Error: Content and IDs mismatch ${index}` : `Error: Announcement does not exist for id ${ref.id}`}
                />)
        }
        const aid = `${queue ? "queue-" : ""}${ref.id}${ref.time ? `-${ref.time}` : ""}`;

        return wrap(aid, index, provided =>
            <AnnouncementComp id={ref} pid={id} announcement={ann} provided={provided} queue={queue}
                unlink={unlink && (() => unlink(ref, index, ann.text))}
                skipTo={props.skipTo && (() => props.skipTo!(index, ref.id, ann))}
            />)
    }


    return (
        <div className={"card my-1" + (pool.priority === 0 && !queue ? " opacity-50" : "")}>
            <div className="card-body">
                {!queue && <PoolTitle {...props} />}
                <div className="position-relative">
                    <InsertHandle pid={id} after={null} />
                </div>
                <Droppable droppableId={id}>
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>
                            <TransitionGroup className='pool vstack'>
                                {props.contents.map(AnnWrapper)}
                                {provided.placeholder}
                            </TransitionGroup>
                        </div>
                    )}
                </Droppable>
            </div>
        </div>
    )
}
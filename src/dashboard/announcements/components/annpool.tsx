import './announcement.scss';

import { Draggable, Droppable } from 'react-beautiful-dnd';
import { AnnPool, AnnRef, Announcement } from 'types/schemas';

import { CSSTransition, TransitionGroup } from 'react-transition-group';
import add from '../../assets/add.svg';
import Editable from "./editable";
import { AnnouncementComp } from './announcement';


export interface AnnPoolProps {
    id: string;
    pool: AnnPool;
    contents: Announcement[];
    addAnn: () => string;
    unlink?: (id: string, index: number, pool: AnnPool) => void;
    removeAnn?: (id: string) => void;
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

function InsertHandle({ insert }: { insert: () => void }) {
    return (
        <div className="addBtn" onClick={insert}>
            <img className="addIcon" src={add} />
        </div>
    )
}


export function AnnPoolComp(props: AnnPoolProps) {
    const { id, pool } = props;
    const queue = id === "queue";

    const removeAnnouncement = (id: string) => {
        pool.announcements.splice(pool.announcements.findIndex((a) => a.id === id), 1);
        if (props.removeAnn) props.removeAnn(id);
    }
    const insertAnnouncement = (index: number) => {
        const id = props.addAnn();
        pool.announcements.splice(index + 1, 0, { id: id });
    }
    const unlink = props.unlink ? (ref: AnnRef, index: number, text: string) => {
        if (confirm("Unlink queued announcement from source?\n" + text))
            props.unlink!(ref.id, index, pool);
    } : undefined;

    function AnnWrapper(ann: Announcement, index: number) {
        const ref = pool.announcements[index];
        if (ref === undefined) return <h5>Error: Content and IDs mismatch {index}</h5>
        if (ann === undefined) return <h5>Error: Announcement does not exist for id {ref.id}</h5>
        const aid = `${queue ? "queue-" : ""}${ref.id}${ref.time ? `-${ref.time}` : ""}`;

        return (
            <CSSTransition timeout={500} key={aid} classNames="item">
                <Draggable key={aid} draggableId={aid} index={index}>
                    {provided => <AnnouncementComp id={ref} announcement={ann} provided={provided} queue={queue}
                        remove={() => removeAnnouncement(ref.id)}
                        unlink={unlink && (() => unlink(ref, index, ann.text))}
                        insert={() => insertAnnouncement(index)}
                        skipTo={props.skipTo && (() => props.skipTo!(index, ref.id, ann))}
                    />}
                </Draggable>
            </CSSTransition>
        )
    }


    return (
        <div className={"card my-1" + (pool.priority === 0 && !queue ? " opacity-50" : "")}>
            <div className="card-body">
                {!queue && <PoolTitle {...props} />}
                <div className="position-relative">
                    <InsertHandle insert={() => insertAnnouncement(0)} />
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
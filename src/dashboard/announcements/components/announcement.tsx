import './announcement.scss';

import { CSSProperties, EventHandler, useRef, useState } from 'react';
import { Draggable, DraggableProvided, Droppable } from 'react-beautiful-dnd';
import {
    CheckLg, GripVertical, Link, Link45deg, Pen, PenFill, PlusCircle, Repeat, XCircle, XLg
} from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import { AnnPool, AnnRef, Announcement } from 'types/schemas';

import add from '../../assets/add.svg';

interface AnnouncementProps {
    id: AnnRef;
    announcement: Announcement;
    provided: DraggableProvided;
    ensureUpdate: () => void;
    delete: (id: string) => void;
    insert: () => void;
    unlink?: () => void;
    queue?: boolean;
}

export function AnnouncementComp(props: AnnouncementProps) {
    const { announcement, provided, queue } = props;
    const temp = announcement.type === "temp";
    const fade = (!queue && announcement.priority === 0) || (queue && announcement.text === "New Announcement")

    return (
        <div ref={provided.innerRef} {...provided.draggableProps} className="card announcement m-1">
            <div className={'card-body hstack gap-2' + (fade ? " opacity-50" : "")}>
                <div {...provided.dragHandleProps}>
                    <GripVertical />
                </div>
                {queue && !temp ? <>
                    <span className="btn btn-outline-secondary" onClick={props.unlink}>
                        <Link45deg />
                    </span>
                    <span className='flex-grow-1 forbid'>{announcement.text}</span>
                </> : <>
                    {queue && <Pen />}
                    <Editable text={announcement.text} setText={v => announcement.text = v} ensureUpdate={props.ensureUpdate} className='flex-grow-1' />
                </>}
                {!queue && <Editable text={announcement.priority.toString()} setText={v => announcement.priority = Number(v)} ensureUpdate={props.ensureUpdate} type="number" className="priority" />}
                {<Stack direction="horizontal" gap={3}>
                    <Button variant="outline-primary" onClick={() => {
                        if (announcement.priority === 0 || confirm(`Are you sure you want to delete\n"${announcement.text}"? `))
                            props.delete(props.id.id)
                    }}><XLg /></Button>
                </Stack>}
            </div>
            <div className="addBtn" onClick={props.insert}>
                <img className="addIcon" src={add} />
            </div>
        </div>
    );
}

interface EditableProps {
    text: string;
    setText: (text: string) => void;
    ensureUpdate?: () => void;
    type?: string;
    className?: string;
}

export function Editable(props: EditableProps) {
    const { text, setText, ensureUpdate, type } = props;
    const [editVal, setEditVal] = useState<string | null>(null);
    const editBox = useRef<HTMLInputElement>(null);
    const resetEditVal = () => setEditVal(null);

    if (editVal === null) {
        return <span className={"editable " + (props.className || "")} onClick={() => setEditVal(text)}>{text} <PenFill /></span>
    } else {
        const submit = () => {
            setText(editBox.current!.value);
            resetEditVal();
            if (ensureUpdate) ensureUpdate();
        };
        const keyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Escape") resetEditVal();
            else if (["Enter", "Backspace"].includes(e.key)) return;
            else if (type === "number" && !/[0-9]/.test(e.key)) e.preventDefault();
        };

        return (
            <Form onSubmit={submit} className={(props.className || "")}>
                <InputGroup>
                    <Form.Control ref={editBox} className="editable" autoFocus
                        defaultValue={editVal} type={type ? type : "text"}
                        onKeyDown={keyPress}
                    />
                    <Button variant="primary" type="submit"><CheckLg /></Button>
                    <Button variant="outline-primary" onClick={resetEditVal}><XLg /></Button>
                </InputGroup>
            </Form>
        )
    }
}

export interface AnnPoolProps {
    id: string;
    pool: AnnPool;
    contents: Announcement[];
    ensureUpdate: () => void;
    addAnn: () => string;
    unlink?: (id: string, index: number, pool: AnnPool) => void;
}

export function AnnPoolComp(props: AnnPoolProps) {
    const { id, pool } = props;
    const queue = id === "queue";

    const deleteAnnouncement = (id: string) => {
        pool.announcements.splice(pool.announcements.findIndex(a => a.id === id), 1);
        props.ensureUpdate();
    }
    const insertAnnouncement = (index: number) => {
        const id = props.addAnn();
        pool.announcements.splice(index + 1, 0, { id: id });
        props.ensureUpdate();
    }

    return (
        <div className={"card my-1" + (pool.priority === 0 && !queue ? " opacity-50" : "")}>
            <div className="card-body">
                {!queue &&
                    <h3 className="m-1 d-flex gap-2">
                        <Editable text={pool.name} className="flex-grow-1" ensureUpdate={props.ensureUpdate}
                            setText={(v) => pool.name = v} />
                        <Editable type="number" className='priority' ensureUpdate={props.ensureUpdate}
                            text={pool.priority.toString()} setText={v => pool.priority = Number(v)} />
                    </h3>
                }
                <div className="position-relative">
                    <div className="addBtn" onClick={() => insertAnnouncement(0)}>
                        <img className="addIcon" src={add} />
                    </div>
                </div>
                <Droppable droppableId={id}>
                    {(provided) => (
                        <div className='pool vstack' {...provided.droppableProps} ref={provided.innerRef}>
                            {props.contents.map((ann, index) => {
                                const baseAID = pool.announcements[index];
                                const aid = `${queue ? "queue-" : ""}${baseAID.id}-${baseAID.time ? baseAID.time : ""}`;
                                if (aid === undefined) return <h5 key={aid}>Error: Content and IDs mismatch for {aid}</h5>
                                if (ann === undefined) return <h5 key={aid}>Error: Corresponding Announcement does not exist for announcement id {aid}</h5>
                                const unlink = props.unlink ? () => {
                                    if (confirm("Unlink queued announcement from source?\n" + ann.text))
                                        props.unlink!(baseAID.id, index, pool);
                                } : undefined;
                                return (
                                    <Draggable key={aid} draggableId={aid} index={index}>
                                        {provided => <AnnouncementComp id={baseAID} announcement={ann} provided={provided} queue={queue}
                                            ensureUpdate={props.ensureUpdate} delete={deleteAnnouncement} insert={() => insertAnnouncement(index)}
                                            unlink={unlink}
                                        />}
                                    </Draggable>
                                )
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
        </div>
    )
}
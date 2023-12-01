import './announcement.scss';

import { CSSProperties, EventHandler, useRef, useState } from 'react';
import { Draggable, DraggableProvided, Droppable } from 'react-beautiful-dnd';
import {
    CheckLg, GripVertical, Link, PenFill, PlusCircle, Repeat, XCircle, XLg
} from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import { AnnPool, Announcement } from 'types/schemas';

import add from '../../assets/add.svg';

interface AnnouncementProps {
    id: string;
    announcement: Announcement;
    provided: DraggableProvided;
    ensureUpdate: () => void;
    delete: (id: string) => void;
    insert: () => void;
}

export function AnnouncementComp(props: AnnouncementProps) {
    const { announcement, provided } = props;
    return (
        <div ref={provided.innerRef} {...provided.draggableProps} className="card announcement m-1">
            <div className={'card-body hstack gap-2' + (announcement.priority === 0 ? " opacity-50" : "")}>
                <div {...provided.dragHandleProps}>
                    <GripVertical />
                </div>
                <Editable text={announcement.text} setText={v => announcement.text = v} ensureUpdate={props.ensureUpdate} outerStyle={{ flexGrow: 1 }} />
                <Editable text={announcement.priority.toString()} setText={v => announcement.priority = Number(v)} ensureUpdate={props.ensureUpdate} type="number" />
                {<Stack direction="horizontal" gap={3}>
                    <Button variant="outline-primary" onClick={() => {
                        if (announcement.priority === 0 || confirm(`Are you sure you want to delete\n"${announcement.text}"? `))
                            props.delete(props.id)
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
    outerStyle?: CSSProperties;
    inputStyle?: CSSProperties;
}

export function Editable(props: EditableProps) {
    const { text, setText, ensureUpdate, type, outerStyle, inputStyle } = props;
    const [editVal, setEditVal] = useState<string | null>(null);
    const editBox = useRef<HTMLInputElement>(null);
    const resetEditVal = () => setEditVal(null);

    if (editVal === null) {
        return <span className="editable" onClick={() => setEditVal(text)} style={outerStyle || {}}>{text} <PenFill /></span>
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
            <Form onSubmit={submit} style={outerStyle || {}}>
                <InputGroup>
                    <Form.Control ref={editBox} className="editable" autoFocus
                        defaultValue={editVal} type={type ? type : "text"}
                        onKeyDown={keyPress} style={inputStyle || {}}
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
    ensureUpdate: () => void;
}

export function AnnPoolComp(props: AnnPoolProps) {
    const { id, pool } = props;

    const deleteAnnouncement = (id: string) => {
        delete pool.announcements[id];
        pool.order = pool.order.filter(e => e !== id);
        props.ensureUpdate();
    }
    const insertAnnouncement = (index: number) => {
        var id;
        do {
            id = `ann-${Math.floor(Math.random() * 100000000)}`;
        } while (pool.order.includes(id));

        pool.announcements[id] = {
            "text": "New Announcement",
            "priority": 0
        }
        pool.order.splice(index + 1, 0, id);
        props.ensureUpdate();
    }

    return (
        <div className="card my-1">
            <div className="card-body">
                <h3 className="m-1">
                    <Editable text={pool.name} setText={(v) => pool.name = v} ensureUpdate={props.ensureUpdate} />
                </h3>
                <div className="position-relative">
                    <div className="addBtn" onClick={() => insertAnnouncement(0)}>
                        <img className="addIcon" src={add} />
                    </div>
                </div>
                <Droppable droppableId={id}>
                    {(provided) => (
                        <div className='pool vstack' {...provided.droppableProps} ref={provided.innerRef}>
                            {pool.order.map((id, index) => {
                                const item = pool.announcements[id];
                                if (item === undefined) return <h3 key={id}>Error: Corresponding Announcement does not exist for announcement id {id}</h3>
                                return (
                                    <Draggable key={id} draggableId={id} index={index}>
                                        {provided => <AnnouncementComp id={id} announcement={item} provided={provided}
                                            ensureUpdate={props.ensureUpdate} delete={deleteAnnouncement} insert={() => insertAnnouncement(index)}
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
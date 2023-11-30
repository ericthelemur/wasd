import './announcement.scss';

import { useRef, useState } from 'react';
import { Draggable, DraggableProvided, Droppable } from 'react-beautiful-dnd';
import { CheckLg, GripVertical, Link, PenFill, Repeat, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import { AnnPool, AnnPools, AnnRef, Announcement } from 'types/schemas';

interface AnnouncementProps {
    id: string;
    announcement: Announcement;
    provided: DraggableProvided;
    ensureUpdate: () => void;
}

export function AnnouncementComp(props: AnnouncementProps) {
    const { announcement, provided } = props;
    return (
        <div ref={provided.innerRef} {...provided.draggableProps} className="card announcement m-1">
            <div className='card-body hstack gap-2'>
                <div {...provided.dragHandleProps}>
                    <GripVertical />
                </div>
                <Editable text={announcement.text} setText={v => announcement.text = v} ensureUpdate={props.ensureUpdate} />
                <Form.Control type="number" defaultValue={announcement.priority} style={{ width: "5em" }} />
                {<Stack direction="horizontal" gap={3}>
                    <Link />
                    <XLg />
                </Stack>}
            </div>
        </div>
    );
}


export function Editable(props: { text: string, setText: (text: string) => void, ensureUpdate?: () => void }) {
    const [editVal, setEditVal] = useState<string | null>(null);
    const editBox = useRef<HTMLInputElement>(null);

    if (editVal === null) {
        return <span className="editable" onClick={() => setEditVal(props.text)}>{props.text} <PenFill /></span>
    } else {
        return (
            <Form className="flex-grow-1"
                onSubmit={() => {
                    props.setText(editBox.current!.value);
                    setEditVal(null);
                    if (props.ensureUpdate) props.ensureUpdate();
                }}
            >
                <InputGroup>
                    <Button variant="outline-primary" type="submit"><CheckLg /></Button>
                    <Form.Control ref={editBox} className="editable" autoFocus
                        defaultValue={editVal}
                        onKeyDown={e => { if (e.key === "Escape") setEditVal(null) }}
                    />
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
    return (
        <div className="card my-1">
            <div className="card-body">
                <h3><Editable text={pool.name} setText={(v) => pool.name = v} ensureUpdate={props.ensureUpdate} /></h3>
                <Droppable droppableId={id}>
                    {(provided) => (
                        <div
                            className='pool p-1 vstack'
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            {pool.order.map((id, index) => {
                                const item = pool.announcements[id];
                                if (item === undefined) return <h3 key={id}>Error: Corresponding Announcement does not exist for announcement id {id}</h3>
                                return (
                                    <Draggable key={id} draggableId={id} index={index}>
                                        {(provided) => (
                                            <AnnouncementComp id={id} announcement={item} provided={provided} ensureUpdate={props.ensureUpdate} />
                                        )}
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
import './announcement.scss';

import { Draggable, DraggableProvided, Droppable } from 'react-beautiful-dnd';
import { GripVertical, Link, Repeat, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
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
        <div ref={provided.innerRef} {...provided.draggableProps} className="card m-1">
            <div className='card-body hstack gap-2'>
                <div {...provided.dragHandleProps}>
                    <GripVertical />
                </div>
                <Form.Control defaultValue={announcement.text} />
                <Form.Control type="number" defaultValue={announcement.priority} style={{ width: "5em" }} />
                {<Stack direction="horizontal" gap={3}>
                    <Link />
                    <XLg />
                </Stack>}
            </div>
        </div>
    );
}

export interface AnnPoolProps {
    id: string;
    pool: AnnPool;
    ensureUpdate: () => void;
}

export function AnnPoolComp(props: AnnPoolProps) {
    const { id, pool } = props;
    return (
        <Droppable droppableId={id}>
            {(provided) => (
                <div
                    className='vstack p-1'
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                >
                    {pool.order.map((id, index) => {
                        const item = pool.announcements[id];
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
    )
}
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
        <div>
            <h3>{pool.name}</h3>
            <Droppable droppableId={id}>
                {(provided) => (
                    <div
                        className='card pool p-1'
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                    >
                        <div className='card-body vstack'>
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
                        </div>
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    )
}
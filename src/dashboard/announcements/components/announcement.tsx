import { Draggable, DraggableProvided, Droppable } from 'react-beautiful-dnd';
import { GripVertical, Repeat, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { Announcement, AnnouncementPool } from 'types/schemas/announcements';

export function AnnouncementComp({ announcement, provided }: { announcement: Announcement, provided: DraggableProvided }) {
    return (
        <div ref={provided.innerRef} {...provided.draggableProps} className="card m-1">
            <div className='card-body p-2 hstack gap-2'>
                <div {...provided.dragHandleProps}>
                    <GripVertical />
                </div>
                <Form.Control defaultValue={announcement.text} />
                <Stack direction="horizontal" gap={3}>
                    <Button
                        variant={announcement.repeat ? "primary" : "outline-primary"}
                        onClick={() => announcement.repeat = !announcement.repeat}
                    >
                        <Repeat />
                    </Button>
                    <XLg className="float-end" />
                </Stack>
            </div>
        </div>
    );
}

export function AnnouncementPoolComp({ pool }: { pool: AnnouncementPool }) {
    return (
        <Droppable droppableId={pool.name} key={pool.name}>
            {(provided) => (
                <div
                    className='vstack p-2'
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                >
                    {pool.items.map((item, index) => (
                        <Draggable key={item.id} draggableId={pool.name + "/" + item.id} index={index}>
                            {(provided) => (
                                <AnnouncementComp announcement={item} provided={provided} />
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    )
}
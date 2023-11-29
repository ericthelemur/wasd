import { GripVertical, Repeat, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { Announcement } from 'types/schemas/announcements';

import type { DraggableProvided } from 'react-beautiful-dnd';

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
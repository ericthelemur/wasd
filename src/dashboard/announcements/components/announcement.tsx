import './announcement.scss';

import { DraggableProvided } from 'react-beautiful-dnd';
import { FastForward, GripVertical, Link45deg, Pen, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import { AnnRef, Announcement } from 'types/schemas';

import add from '../../assets/add.svg';
import Editable from "./editable";
import { sendTo, sendToF } from 'common/listeners';

interface AnnouncementProps {
    id: AnnRef;
    pid: string;
    announcement: Announcement;
    provided: DraggableProvided;
    unlink?: () => void;
    skipTo?: () => void;
    queue?: boolean;
}

function AnnouncementBody(props: AnnouncementProps) {
    const { announcement, queue } = props;
    const temp = announcement.type === "temp";
    const text = queue && !temp
        ? <span className='flex-grow-1 forbid'><Link45deg /> {announcement.text}</span>
        : <>
            {queue && <Pen className="small" />}
            <Editable className='flex-grow-1' as="textarea" text={announcement.text}
                setText={v => announcement.text = v} />
        </>
    const priority = queue ? undefined :
        <Editable type="number" className="priority" text={announcement.priority.toString()}
            setText={v => announcement.priority = Number(v)} />
    return <>{text}{priority}</>
}


function AnnouncementControls(props: AnnouncementProps) {
    const { id, announcement, queue } = props;
    const temp = announcement.type === "temp";

    function del() {
        console.log("Deleting");
        if (announcement.priority === 0 || confirm(`Are you sure you want to delete\n"${announcement.text}"? `)) {
            sendTo("removeAnnouncement", { aid: id.id });
        }
    }

    return (
        <InputGroup className="card-ctrls">
            {queue &&
                <Button variant="outline-secondary" onClick={props.skipTo}><FastForward /></Button>}
            {queue && !temp &&
                <Button variant="outline-secondary" onClick={props.unlink}><Link45deg /></Button>}
            <Button variant="outline-primary" onClick={del}><XLg /></Button>
        </InputGroup>
    )
}


export function AnnouncementComp(props: AnnouncementProps) {
    const { announcement, provided, queue } = props;
    const fade = (!queue && announcement.priority === 0) || (queue && announcement.text === "New Announcement")

    return (
        <div ref={provided.innerRef} {...provided.draggableProps} className="card announcement m-1">
            <div className={'card-body d-flex gap-2' + (fade ? " opacity-50" : "")}>
                <div {...provided.dragHandleProps}> <GripVertical /> </div>
                <AnnouncementBody {...props} />
                <AnnouncementControls {...props} />
            </div>
            <div className="addBtn" onClick={sendToF("addAnnouncement", { pid: props.pid, after: props.id })}>
                <img className="addIcon" src={add} />
            </div>
        </div>
    );
}

interface AnnErrorProps {
    id?: AnnRef;
    pid: string;
    msg: string;
    index: number;
    provided: DraggableProvided;
}

export function AnnouncementError(props: AnnErrorProps) {
    return (
        <div ref={props.provided.innerRef} {...props.provided.draggableProps} className="card announcement m-1">
            <div className={'card-body d-flex gap-2 opacity-50'}>
                <div {...props.provided.dragHandleProps}> <GripVertical /> </div>
                <h6>{props.msg}</h6>
                {props.id && <InputGroup className="card-ctrls">
                    <Button variant="outline-primary" onClick={sendToF("removeAnnouncement", { aid: props.id!.id })}><XLg /></Button>
                </InputGroup>}
            </div>
            {props.id && <div className="addBtn" onClick={sendToF("addAnnouncement", { pid: props.pid, after: props.id! })}>
                <img className="addIcon" src={add} />
            </div>}
        </div>
    );
}

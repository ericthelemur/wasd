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
    queue?: boolean;
    strike?: boolean;
}

function AnnouncementBody(props: AnnouncementProps) {
    const { announcement, queue } = props;
    const temp = announcement.type === "temp";
    const text = queue && !temp
        ? <span className='flex-grow-1 forbid input-group-text'><Link45deg /> {announcement.text}</span>
        : <>
            {queue && <Pen className="small" />}
            <Editable className='flex-grow-1' textClasses="input-group-text" text={announcement.text}
                setText={v => announcement.text = v} />
        </>
    const priority = queue ? undefined :
        <Editable type="number" className="priority" textClasses="input-group-text" text={announcement.priority.toString()}
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
        <>
            {queue &&
                <Button variant="outline-secondary" onClick={sendToF("skipTo", { aref: id })}><FastForward /></Button>}
            {queue && !temp &&
                <Button variant="outline-secondary" onClick={sendToF("unlink", { aref: id })}><Link45deg /></Button>}
            <Button variant="outline-primary" onClick={del}><XLg /></Button>
        </>
    )
}

export function InsertHandle(props: { pid: string; before: AnnRef | null; }) {
    return (
        <div className="addBtn" onClick={sendToF("addAnnouncement", props)}>
            <img className="addIcon" src={add} />
        </div>
    )
}


export function AnnouncementComp(props: AnnouncementProps) {
    const { announcement, provided, queue, strike } = props;
    if (announcement === undefined) return <AnnouncementError {...props} msg="Announcement is undefined" index={-1} />
    const fade = (!queue && announcement.priority === 0) || (queue && announcement.text === "New Announcement") || strike;

    return (
        <div
            ref={provided.innerRef} {...provided.draggableProps}
            className={`input-group m-1 ${fade ? "opacity-50" : ""}`}
            {...(strike ? { style: { textDecoration: "line-through" } } : {})}
        >
            <div className="btn btn-outline-secondary" {...provided.dragHandleProps}> <GripVertical /> </div>
            {!strike && <InsertHandle pid={props.pid} before={props.id} />}
            <AnnouncementBody {...props} />
            {!strike && <AnnouncementControls {...props} />}
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
            {props.id && <InsertHandle pid={props.pid} before={props.id} />}
        </div>
    );
}

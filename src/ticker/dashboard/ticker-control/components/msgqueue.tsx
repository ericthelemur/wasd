import './pool.scss';

import { sendTo, sendToF } from 'common/listeners';
import { DraggableProvided } from 'react-beautiful-dnd';
import { FastForward, GripVertical, Link45deg, Pen, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import { Message, MsgRef } from 'types/schemas';
import Editable from 'wasd-common/shared/components/editable';

import add from '../../assets/add.svg';

interface MessageProps {
    id: MsgRef;
    pid: string;
    message: Message;
    provided: DraggableProvided;
    queue?: boolean;
    strike?: boolean;
}

function QueueMsgBody(props: MessageProps) {
    const { message, queue } = props;
    const temp = message.type === "temp";
    const text = queue && !temp
        ? <span className='msg-text input-group-text'><Link45deg /> {message.text}</span>
        : <>
            <Editable className='msg-text' textClasses="input-group-text"
                prefix={queue ? <Pen className="small me-1" /> : ""}
                text={message.text} setText={v => message.text = v} />
        </>
    const priority = queue ? undefined :
        <Editable className="priority" textClasses="input-group-text" text={message.priority.toString()}
            setText={v => message.priority = Number(v)} />
    return <>{text}{priority}</>
}


function QueueMsgControls(props: MessageProps) {
    const { id, message, queue } = props;
    const temp = message.type === "temp";

    function del() {
        if (message.priority === 0 || confirm(`Are you sure you want to delete\n"${message.text}"? `))
            sendTo("removeMessage", { mid: id.id });
    }
    return <>
        {queue && <Button variant="outline-secondary" onClick={sendToF("skipTo", { aref: id })}><FastForward /></Button>}
        {queue && !temp && <Button variant="outline-secondary" onClick={sendToF("unlink", { aref: id })}><Link45deg /></Button>}
        <Button variant="outline-primary" onClick={del}><XLg /></Button>
    </>
}

export function InsertHandle(props: { pid: string; before: MsgRef | null; }) {
    return (
        <div className="addBtn" onClick={sendToF("addMessage", props)}>
            <img className="addIcon" src={add} />
        </div>
    )
}


export function QueueMsg(props: MessageProps) {
    const { message, provided, queue, strike } = props;
    if (message === undefined) return <MsgError {...props} msg="Message is undefined" index={-1} />
    const fade = (!queue && message.priority === 0) || (queue && message.text === "New Message") || strike;

    return (
        <div
            ref={provided.innerRef} {...provided.draggableProps}
            className={`input-group m-1 ${fade ? "opacity-50" : ""} ${queue ? "forbid" : ""}`}
            {...(strike ? { style: { textDecoration: "line-through" } } : {})}
        >
            <div className="btn btn-outline-secondary" {...provided.dragHandleProps}
                {...(strike ? { style: { pointerEvents: "none" } } : {})}>
                <GripVertical />
            </div>
            {!strike && <InsertHandle pid={props.pid} before={props.id} />}
            <QueueMsgBody {...props} />
            {!strike && <QueueMsgControls {...props} />}
        </div>
    );
}

interface MsgErrorProps {
    id?: MsgRef;
    pid: string;
    msg: string;
    index: number;
    provided: DraggableProvided;
}

export function MsgError(props: MsgErrorProps) {
    return (
        <div ref={props.provided.innerRef} {...props.provided.draggableProps} className="card message m-1">
            <div className={'card-body d-flex gap-2 opacity-50'}>
                <div {...props.provided.dragHandleProps}> <GripVertical /> </div>
                <h6>{props.msg}</h6>
                {props.id && <InputGroup className="card-ctrls">
                    <Button variant="outline-primary" onClick={sendToF("removeMessage", { mid: props.id!.id })}><XLg /></Button>
                </InputGroup>}
            </div>
            {props.id && <InsertHandle pid={props.pid} before={props.id} />}
        </div>
    );
}

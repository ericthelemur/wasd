
import './editable.scss';

import React, { ElementType, useRef, useState } from 'react';
import { CheckLg, PenFill, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import ContentEditable from 'react-contenteditable';

export interface EditableProps {
    text: string;
    setText: (text: string) => void;
    type?: "single" | "multi";
    className?: string;
    textClasses?: string;
    prefix?: JSX.Element | string;  // Migrate to prefix at some point
    container?: boolean;
    preview?: JSX.Element | string;
}

interface SP {
    stopPropagation: () => void;
}

function sp<T extends SP>(f: (e: T) => void) {
    return (e: T) => {
        e.stopPropagation();
        return f(e);
    }
}

export default function Editable(props: EditableProps) {
    const { text, setText } = props;
    const [wasText, setWasText] = useState(false);
    const [editVal, setEditVal] = useState<string | null>(null);
    const editBox = useRef<HTMLInputElement>(null);
    const resetEditVal = () => setEditVal(null);

    if (editVal === null) {
        if (wasText) setWasText(false);
        return <div className={`editable ${props.className || ""} ${props.textClasses || ""}`}
            onClick={sp(() => setEditVal(text))}>
            {props.prefix} {props.preview || text} <PenFill className="icon" />
        </div>
    } else {
        const submit = () => {
            setText(editBox.current!.value || editBox.current!.innerText);
            resetEditVal();
        };
        const keyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Escape") resetEditVal();
            if (e.key === "Enter") submit();
        };

        if (!wasText) {
            setWasText(true);
            setTimeout(() => editBox.current?.focus(), 0);
        }
        const classes = "editable input form-control " + (props.className || "");

        const content = <>
            {props.type === "multi" ?
                <ContentEditable innerRef={editBox} className={classes} html={editVal}
                    onKeyDown={keyPress} onChange={sp((e) => setEditVal(e.target.value))}
                    onFocus={e => window.getSelection()!.selectAllChildren(e.target)}
                /> :
                <Form.Control ref={editBox} className={classes} defaultValue={editVal}
                    onKeyDown={keyPress} autoFocus onFocus={e => e.target.select()}
                />
            }
            <Button variant="primary" type="submit" onClick={sp(submit)}><CheckLg /></Button>
            <Button variant="outline-primary" onClick={sp(resetEditVal)}><XLg /></Button>
        </>
        return props.container ? <div className="input-group editable-outer">{content}</div> : content
    }
}
import '../../common/uwcs-bootstrap.css';

import { createRoot } from 'react-dom/client';

import { CreateCommPointConnect } from '../../common/commpoint/login';
import listeners, { sendTo, sendToF } from '../messages';
import { useReplicant } from 'use-nodecg';
import type { Display, Images } from 'types/schemas/loupedeck';
import { useState } from 'react';
import Blank from "./blank.png";
import { Modal } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { RepEditor } from '../../dev/dashboard/codeeditor';
import { getParentAt } from '../common/jsonDeep';
import { useReplicant as useReplicantCustom } from '../../dev/dashboard/useNodeCGCustom';
import clone from 'clone';
import NodeCG from '@nodecg/types';


const ControlForm = CreateCommPointConnect("loupedeck", listeners, {}, {}, { connected: "disconnected" });

const gridWidth = 5;
const gridHeight = 3;
const pixelWidth = 96;

const yCoords = Array(...Array(gridHeight).keys());
const xCoords = Array(...Array(gridWidth).keys());

function ButtonEditModal<T>(props: { label: string, path: string, rep: [T, (v: T) => any, NodeCG.ClientReplicant<T>], close: () => any }) {
    if (!props.rep[0]) return;
    const [parent, child] = getParentAt(props.rep[0], props.path);
    if (!parent) props.close();

    // function onSetData(v: any) {
    //     console.log("New data", v);
    //     const newData = clone(props.rep[0]);
    //     const [newParent, newChild] = getParentAt(newData, props.path);
    //     console.log("New p & c", newParent, newChild);
    //     newParent[newChild] = v;
    //     console.log("Applied", newParent);
    //     console.log("Validating", newData);
    //     if (props.rep[2].validate(newData)) {
    //         props.rep[1](newData);
    //     }
    // }

    function insertData(v: any) {
        const newData = clone(props.rep[0]);
        const [newParent, newChild] = getParentAt(newData, props.path);
        newParent[newChild] = v;
        return newData;
    }

    function validate(v: any) {
        const newData = insertData(v);

        let valid: any;
        try {
            const valid = props.rep[2].validate(newData);
            return valid;
        } catch (e) {
            return String(e);
        }
    }

    function setData(v: any) {
        const newData = insertData(v);
        props.rep[1](newData);
    }

    return <Modal show={true} fullscreen="md-down" onHide={props.close}>
        <Modal.Header closeButton className="h4">Edit {props.label}</Modal.Header>
        <Modal.Body>
            <Form>
                <RepEditor data={parent[child] || {}} setData={v => setData(v)} validate={validate} />
            </Form>
        </Modal.Body>
    </Modal>
}

function LoupedeckPanel() {
    const [images,] = useReplicant<Images | undefined>("images", undefined, { namespace: "loupedeck" });
    const rep = useReplicantCustom<Display | undefined>("display", undefined, { namespace: "loupedeck" });
    const [display, ,] = rep;
    const [edit, setEdit] = useState<null | [string, string]>(null);
    if (!images || !display) return;

    function editClick(e: React.ChangeEvent<HTMLSelectElement>) {
        if (e.target.value == "edit" && edit != null) {
            setEdit(null);
        } else {
            const label = e.target.options[e.target.selectedIndex]?.text;
            const innerPath = e.target.value;
            const path = `pages.${display!.current}${innerPath ? "." + innerPath : ""}`;
            console.log(e.target, label, path);
            setEdit([label, path]);
        }
    }

    return <div className="m-3">
        <Form.Group>
            <Form.Select aria-label="Select Loupedeck Page" value={display.current} onChange={e => sendTo("setPage", e.target.value)}>
                {Object.entries(display.pages).filter(([k, p]) => k != "page").map(([k, p]) => <option key={k} value={k}>{p.display || k}</option>)}
            </Form.Select>
        </Form.Group>
        <div className="my-3 gap-2" style={{ display: "grid", gridTemplateColumns: `repeat(${gridWidth}, minmax(0, ${pixelWidth}px))` }}>
            {yCoords.map(y => xCoords.map(x => <LoupedeckButton key={y * gridWidth + x} index={y * gridWidth + x} image={images[y * gridWidth + x]} />))}
        </div>

        {edit && <ButtonEditModal<Display | undefined> label={edit[0]} path={edit[1]} rep={rep} close={() => setEdit(null)} />}

        <Form.Select aria-label="Edit Button" value={edit || "edit"} onChange={editClick}>
            <option value="edit">Edit Button</option>
            <option value="screen.0">S1,1: Top Left</option>
            <option value="screen.1">S1,2</option>
            <option value="screen.2">S1,3</option>
            <option value="screen.3">S1,4</option>
            <option value="screen.4">S1,5: Top Right</option>
            <option value="screen.5">S2,1</option>
            <option value="screen.6">S2,2</option>
            <option value="screen.7">S2,3</option>
            <option value="screen.8">S2,4</option>
            <option value="screen.9">S2,5</option>
            <option value="screen.10">S3,1: Bottom Left</option>
            <option value="screen.11">S3,2</option>
            <option value="screen.12">S3,3</option>
            <option value="screen.13">S3,4</option>
            <option value="screen.14">S3,5: Bottom Right</option>
            <option value="knobs">Knobs</option>
            <option value="buttons">Buttons</option>
            <option value="">State ({display.current})</option>
        </Form.Select>
    </div>
}

function LoupedeckButton(props: { index: number, image: string | null }) {
    return <img className="loupedeck-button rounded" style={{ cursor: "pointer", width: "100%" }}
        src={props.image ? `data:image/png;base64,${props.image}` : Blank}
        onMouseDown={sendToF("screenDown", { key: props.index })}
        onMouseUp={sendToF("screenUp", { key: props.index })}
    />
}

const root = createRoot(document.getElementById('root')!);
root.render(<>
    <ControlForm />
    <LoupedeckPanel />
</>);

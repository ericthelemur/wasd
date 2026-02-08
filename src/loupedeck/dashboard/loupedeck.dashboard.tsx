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


const ControlForm = CreateCommPointConnect("loupedeck", listeners, {}, {}, { connected: "disconnected" });

const gridWidth = 5;
const gridHeight = 3;
const pixelWidth = 96;

const yCoords = Array(...Array(gridHeight).keys());
const xCoords = Array(...Array(gridWidth).keys());

function ButtonEditModal<T>(props: { label: string, path: string, rep: T, setRep: (val: T) => any, close: () => any }) {
    const [parent, child] = getParentAt(props.rep, props.path);
    if (!parent) props.close();

    return <Modal show={true} fullscreen="md-down" onHide={close}>
        <Modal.Header closeButton className="h4">Edit {props.label}</Modal.Header>
        <Modal.Body>
            <Form>
                <RepEditor data={parent[child]} setData={(v) => { parent[child] = v; props.setRep(props.rep) }} />
            </Form>
        </Modal.Body>
    </Modal>
}

function LoupedeckPanel() {
    const [images,] = useReplicant<Images | undefined>("images", undefined, { namespace: "loupedeck" });
    const [display, setDisplay] = useReplicant<Display | undefined>("display", undefined, { namespace: "loupedeck" });
    const [edit, setEdit] = useState<null | [string, string]>(null);
    if (!images || !display) return;

    function editClick(e: React.ChangeEvent<HTMLSelectElement>) {
        if (e.target.value == "edit") {
            setEdit(null);
        } else {
            const path = `pages.${display!.current}.${e.target.value}`;
            setEdit([e.target.innerText, path]);
        }
    }

    return <div className="m-3">
        <Form.Group>
            <Form.Select aria-label="Select Loupedeck Page" value={display.current} onChange={e => sendTo("setPage", e.target.value)}>
                {Object.entries(display.pages).filter(([k, p]) => k != "page").map(([k, p]) => <option key={k} value={k}>{p.display || k}</option>)}
            </Form.Select>
        </Form.Group>
        <div className="mt-3 gap-2" style={{ display: "grid", gridTemplateColumns: `repeat(${gridWidth}, minmax(0, ${pixelWidth}px))` }}>
            {yCoords.map(y => xCoords.map(x => <LoupedeckButton key={y * gridWidth + x} index={y * gridWidth + x} image={images[y * gridWidth + x]} />))}
        </div>
        <Form.Select aria-label="Edit Button" value={edit || "edit"} onChange={editClick}>
            <option value="edit">Edit Button</option>
            <option value="screen.0">S1,1: Top Left</option>
            <option value="screen.1">S1,2</option>
            <option value="screen.2">S1,3</option>
            <option value="screen.3">S1,4</option>
            <option value="screen.4">S1,5</option>
            <option value="screen.5">S2,1</option>
            <option value="screen.5">S2,1</option>
            <option value="knobs.channels.0">Knob 1 Rotate</option>
            <option value="knobs.buttons.0">Knob 1 Press</option>
            <option value="knobs.channels.1">Knob 2 Rotate</option>
            <option value="knobs.buttons.1">Knob 2 Press</option>
            <option value="buttons.0">Button BL Press</option>
            <option value="buttons.1">Button TR Press</option>
            <option value="buttons.2">Button MR Press</option>
            <option value="buttons.3">Button BR Press</option>
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

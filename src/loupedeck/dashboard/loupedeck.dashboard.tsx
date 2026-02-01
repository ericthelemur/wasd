import '../../common/uwcs-bootstrap.css';

import { createRoot } from 'react-dom/client';

import { CreateCommPointConnect } from '../../common/commpoint/login';
import listeners, { ListenerTypes, sendTo, sendToF } from '../messages';
import { useListenFor, useReplicant } from 'use-nodecg';
import { Display, Images } from 'types/schemas/loupedeck';
import { useState } from 'react';
import Blank from "./blank.png";
import { Dropdown } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';


const ControlForm = CreateCommPointConnect("loupedeck", listeners, {}, {}, { connected: "disconnected" });

const gridWidth = 5;
const gridHeight = 3;
const pixelWidth = 96;

const yCoords = Array(...Array(gridHeight).keys());
const xCoords = Array(...Array(gridWidth).keys());

function LoupedeckPanel() {
    const [images,] = useReplicant<Images | undefined>("images", undefined, { namespace: "loupedeck" });
    const [display,] = useReplicant<Display | undefined>("display", undefined, { namespace: "loupedeck" })
    if (!images || !display) return;

    return <div>
        <Form.Select aria-label="Select Loupedeck Page" value={display.current} onChange={e => sendTo("setPage", e.target.value)}>
            {Object.entries(display.pages).filter(([k, p]) => k != "page").map(([k, p]) => <option key={k} value={k}>{p.display || k}</option>)}
        </Form.Select>
        <div className="m-3 gap-2" style={{ display: "grid", gridTemplateColumns: `repeat(${gridWidth}, minmax(0, ${pixelWidth}px))` }}>
            {yCoords.map(y => xCoords.map(x => <LoupedeckButton key={y * gridWidth + x} index={y * gridWidth + x} image={images[y * gridWidth + x]} />))}
        </div>
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

import '../../common/uwcs-bootstrap.css';

import { createRoot } from 'react-dom/client';

import { CreateCommPointConnect } from '../../common/commpoint/login';
import listeners, { ListenerTypes, sendToF } from '../messages';
import { useListenFor, useReplicant } from 'use-nodecg';
import { Display, Images } from 'types/schemas/loupedeck';
import { useState } from 'react';
import Blank from "./blank.png";

const root = createRoot(document.getElementById('root')!);

const ControlForm = CreateCommPointConnect("loupedeck", <></>, () => ({}), { connected: "disconnected" }, listeners);

const gridWidth = 5;
const gridHeight = 3;
const pixelWidth = 96;

const yCoords = Array(...Array(gridHeight).keys());
const xCoords = Array(...Array(gridWidth).keys());

function LoupedeckPanel() {
    const [images,] = useReplicant<Images | undefined>("images", undefined, { namespace: "loupedeck" });
    if (!images) return;
    return <div className="m-3 gap-2" style={{ display: "grid", gridTemplateColumns: `repeat(${gridWidth}, minmax(0, ${pixelWidth}px))` }}>
        {yCoords.map(y => xCoords.map(x => <LoupedeckButton key={y * gridWidth + x} index={y * gridWidth + x} image={images[y * gridWidth + x]} />))}
    </div>
}

function LoupedeckButton(props: { index: number, image: string | null }) {
    return <img className="loupedeck-button rounded" style={{ cursor: "pointer", width: "100%" }}
        src={props.image ? `data:image/png;base64,${props.image}` : Blank}
        onMouseDown={sendToF("screenDown", { key: props.index })}
        onMouseUp={sendToF("screenUp", { key: props.index })}
    />
}

root.render(<>
    <ControlForm />
    <LoupedeckPanel />
</>);

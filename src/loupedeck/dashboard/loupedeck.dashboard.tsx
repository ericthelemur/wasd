import '../../common/uwcs-bootstrap.css';

import { createRoot } from 'react-dom/client';

import { CreateCommPointConnect } from '../../common/commpoint/login';
import listeners, { ListenerTypes } from '../messages';
import { useListenFor, useReplicant } from 'use-nodecg';
import { Display, Images } from 'types/schemas/loupedeck';
import { useState } from 'react';

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
    return <div className="gap-2" style={{ display: "grid", gridTemplateColumns: (" " + pixelWidth).repeat(gridWidth) }}>
        {yCoords.map(y => xCoords.map(x => <LoupedeckButton key={y * gridWidth + x} index={y * gridWidth + x} image={images[y * gridWidth + x]} />))}
    </div>
}

function LoupedeckButton(props: { index: number, image: string | null }) {
    return <img width={pixelWidth} height={pixelWidth} src={`data:image/png;base64,${props.image}`} />
}

root.render(<>
    <ControlForm />
    <LoupedeckPanel />
</>);

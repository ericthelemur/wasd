import '../../../common/uwcs-bootstrap.css';
import './break.scss';
import '../overlay/overlay.graphic.scss';
import '../../../common/custom.d';

import { createRoot } from 'react-dom/client';

import { CountdownComp } from './components/countdown';
import { Slides } from './components/slides';
import { CurrentSong } from './components/song';
import { CustomBreakText } from '../../../types/schemas';
import { useReplicant } from 'use-nodecg';

import SpecialEffect from '../assets/specialeffect-white.png';
import WASDKeys from '../assets/wasd-keys.svg';

function VR() {
    return <div style={{ height: "100%", width: "var(--bw)", backgroundColor: "white" }} />
}

export function Break() {
    const [custom,] = useReplicant<CustomBreakText>("customBreakText", {});

    return <div className='break h-100 d-flex h1'>
        <div className="sidebar p-5">
            <div className="vstack gap-3 align-items-center">
                <img src={WASDKeys} style={{ width: "75%" }} />
                <img src={SpecialEffect} style={{ width: "80%" }} />
            </div>
            <CountdownComp />
            {!(custom?.disabled?.song) && <CurrentSong />}
        </div>
        <VR />
        <div className="main" style={{ fontSize: "0.9em" }}>
            <Slides />
        </div>
    </div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<Break />);

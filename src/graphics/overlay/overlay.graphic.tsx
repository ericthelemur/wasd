import 'wasd-common/shared/uwcs-bootstrap.css';
import './overlay.graphic.scss';

import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Camera } from './components/cam';
import { Game, TimerComp } from './components/game';
import { Sidebar } from './components/sidebar';

function fetchFromParams(): [number, number] {
    const url = new URL(window.location.href);
    var params = url.searchParams;
    const aspect = params.get("aspect");
    if (aspect) {
        try {
            const parts = aspect.split("-").map(v => Number.parseInt(v));
            return [parts[0], parts[1]]
        } catch { }
    }
    return [16, 9];
}
function Overlay() {
    const [aspect,] = useState<[number, number]>(fetchFromParams());

    const infoInSidebar = 9 * aspect[0] < 16 * aspect[1];
    console.log(aspect, infoInSidebar);

    return <div className="fill d-flex outer">
        <Sidebar className="flex-grow-1" style={{ marginRight: "calc(-0.5 * var(--bw)" }}>
            {infoInSidebar && <><Game vertical={true} /><TimerComp /></>}
        </Sidebar>
        <div className="d-flex flex-column" style={{ marginLeft: "calc(-0.5 * var(--bw)" }}>
            <Camera camName="game" aspectRatio={`${aspect[0]} / ${aspect[1]}`} dims={infoInSidebar ? [null, 1010] : [1520, null]} />
            {!infoInSidebar && <div className="d-flex vcentre flex-gs">
                <Game />
                <TimerComp />
            </div>}
        </div>
    </div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<Overlay />);

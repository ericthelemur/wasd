import 'wasd-common/shared/uwcs-bootstrap.css';
import './overlay.graphic.scss';

import { createRoot } from 'react-dom/client';

import { Camera } from './components/cam';
import { Game, TimerComp } from './components/game';
import { Sidebar } from './components/sidebar';

function Overlay() {
    return <div className="fill d-flex outer">
        <Sidebar className="flex-grow-1" />
        <div className="d-flex flex-column" style={{ width: "1440px" }}>
            <Camera camName="game" aspectRatio={"16 / 9"} />
            <div className="d-flex vcentre noflow">
                <Game />
                <TimerComp />
            </div>
        </div>
    </div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<Overlay />);

import 'wasd-common/shared/uwcs-bootstrap.css';
import './overlay.graphic.scss';

import { createRoot } from 'react-dom/client';

import { Camera } from './components/cam';
import { GameDetails } from './components/game';
import { Sidebar } from './components/sidebar';

function Overlay() {
    return <div className="fill d-flex outer">
        <Sidebar className="flex-grow-1" />
        <div style={{ width: "1530px" }}>
            <Camera camName="game" aspectRatio={"16 / 9"} />
            <GameDetails />
        </div>
    </div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<Overlay />);

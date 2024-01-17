import 'wasd-common/shared/uwcs-bootstrap.css';
import './overlay.graphic.scss';

import { createRoot } from 'react-dom/client';

import { Camera } from './components/cam';
import { Sidebar } from './components/sidebar';

function Overlay() {
    return <div className="fill d-flex outer">
        <Sidebar style={{ width: "400px" }} />
        <div className="flex-grow-1">
            <Camera camName="run1" aspectRatio={"16 / 9"} />
        </div>
    </div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<Overlay />);

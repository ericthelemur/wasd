import 'wasd-common/shared/uwcs-bootstrap.css';
import './break.scss';
import '../overlay/overlay.graphic.scss';
import 'wasd-common/shared/custom.d';

import { createRoot } from 'react-dom/client';

import { CountdownComp } from './components/countdown';

function VR() {
    return <div style={{ height: "100%", width: "var(--bw)", backgroundColor: "white" }} />
}

export function Break() {
    return <div className='break h-100 d-flex'>
        <div className="sidebar" style={{ flexGrow: 1, backgroundColor: "red" }}>
            <CountdownComp />
        </div>
        <VR />
        <div className="main" style={{ flexGrow: 3, backgroundColor: "green" }}></div>
    </div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<Break />);

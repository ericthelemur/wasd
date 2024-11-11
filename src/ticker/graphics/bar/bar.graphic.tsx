import '../../../common/uwcs-bootstrap.css';
import './bar.scss';
import '../../../common/custom.d';

import { createRoot } from 'react-dom/client';

function VR() {
    return <div className="vr" />;
}


const root = createRoot(document.getElementById('root')!);
root.render(<VR />);

import 'wasd-common/shared/uwcs-bootstrap.css';
import './break.scss';
import '../overlay/overlay.graphic.scss';
import 'wasd-common/shared/custom.d';

import { createRoot } from 'react-dom/client';

export function Break() {
    return <div className='break h-100 d-flex'>

    </div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<Break />);

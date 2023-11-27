import '../uwcs-bootstrap.css';
import './bar.graphic.css';

import { createRoot } from 'react-dom/client';

export function Bar() {
    return (
        <h1>New Graphic</h1>
    )
}

const root = createRoot(document.getElementById('root')!);
root.render(<Bar />);

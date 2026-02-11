import { createRoot } from 'react-dom/client';

import bg from '../assets/bg.png';

function Background() {
    return <img src={bg} style={{ width: 1920, height: 1080 }} />
}

const root = createRoot(document.getElementById('root')!);
root.render(<Background />);

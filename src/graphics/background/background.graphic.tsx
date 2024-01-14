import { createRoot } from 'react-dom/client';

import bg from '../assets/bg.png';

function Background() {
    return <img src={bg} style={{ width: "100%", height: "100%" }} />
}

const root = createRoot(document.getElementById('root')!);
root.render(<Background />);

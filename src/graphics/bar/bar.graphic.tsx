import '../uwcs-bootstrap.css';

import { Bar } from 'graphics/components/bar';
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);
root.render(<Bar />);

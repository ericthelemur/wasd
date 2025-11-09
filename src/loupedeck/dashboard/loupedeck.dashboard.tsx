import '../../common/uwcs-bootstrap.css';

import { createRoot } from 'react-dom/client';

import { CreateCommPointConnect } from '../../common/commpoint/login';
import listeners from '../messages';

const root = createRoot(document.getElementById('root')!);

const ControlForm = CreateCommPointConnect("loupedeck", <></>, () => ({}), { connected: "disconnected" }, listeners);
root.render(<ControlForm />);

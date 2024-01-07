import 'wasd-common/shared/uwcs-bootstrap.css';
import './people.scss';

import { RecordFill, Wifi } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import { createRoot } from 'react-dom/client';
import { ConnStatus, Login, ObsStatus, PreviewScene, ProgramScene, SceneList } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

function Person() {
	return <></>
}

export function PeoplePanel() {
	return <div className="m-3">
	</div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

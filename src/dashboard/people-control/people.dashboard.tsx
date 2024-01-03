import '../uwcs-bootstrap.css';
import "./people.scss"

import { createRoot } from 'react-dom/client';
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Badge from "react-bootstrap/Badge";
import Stack from "react-bootstrap/Stack";
import { RecordFill, Wifi } from "react-bootstrap-icons";
import { useReplicant } from "use-nodecg";
import { PreviewScene, ProgramScene, SceneList, ObsStatus, ConnStatus, Login } from 'types/schemas';

function Person() {
	return <></>
}

export function PeoplePanel() {
	return <div className="m-3">
	</div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

import '../../../common/uwcs-bootstrap.css';
import './mixer.scss';

import { ExclamationTriangleFill, InfoCircleFill } from 'react-bootstrap-icons';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';
import { createRoot } from 'react-dom/client';
import { Login, Status } from 'types/schemas/mixer';
import { useReplicant } from 'use-nodecg';


import { CreateCommPointConnect } from '../../../common/commpoint/login';
import type { Replicants } from "../../extension/mixer/mixer";
import listeners, { ListenerTypes } from '../../messages';

function SurpressSwitch({ status }: { status: Status }) {
	const [login, setLogin] = useReplicant<Login>("login", { "ip": "", "port": 10024 }, { namespace: "mixer" });

	return <>{(status.connected == "connected" && login) && <div className={login.suppress ? "text-danger mt-2" : "mt-2"}>
		{login?.suppress ? <ExclamationTriangleFill /> : <InfoCircleFill />}
		{" "}<Form.Check type="switch" className="d-inline-block ms-3" checked={login.suppress} label="Suppress DCA updates"
			onChange={(e) => {
				if (!e.target.checked || confirm("Surpress automatic DCA updates?")) {
					setLogin({ ...login, suppress: e.target.checked })
				}
			}} />
	</div>}
	</>
}

const ControlForm = CreateCommPointConnect<ListenerTypes, Replicants>("mixer", listeners, {
	ip: "Mixer IP",
	port: "Mixer Port",
} as const, { ip: "", port: 0 }, { connected: "disconnected" }, SurpressSwitch, l => l.port = Number(l.port));

const root = createRoot(document.getElementById('root')!);
root.render(<ControlForm />);

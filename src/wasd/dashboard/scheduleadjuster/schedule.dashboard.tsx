import '../../../common/uwcs-bootstrap.css';

import Form from 'react-bootstrap/Form';
import { createRoot } from 'react-dom/client';
import { Config, StreamState } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import Editable from 'common/components/editable';

function ScheduleAdjuster() {
	const [state, setState] = useReplicant<StreamState>("streamState", { "state": "BREAK" });
	const [config, setConfig] = useReplicant<Config>("config", { "oengusShortcode": "code", "oengusScheduleSlug": "slug" });
	if (!state || !config) return;

	return <div className="m-3">
		<Editable text={String(Math.abs(state.minsBehind || 0))} setText={(v) => state.minsBehind = Number(v)} prefix={state.minsBehind && state.minsBehind > 0 ? "Behind" : "Ahead"} container={true} /><br />
		<Form.Check type="switch" className="d-inline-block ms-3" checked={config.updateMinsBehind}
			label="Auto-Update Mins Behind" onChange={() => setConfig({ ...config, updateMinsBehind: !config.updateMinsBehind })} />
	</div>
}


const root = createRoot(document.getElementById('root')!);
root.render(<ScheduleAdjuster />);

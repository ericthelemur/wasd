import '../../../common/uwcs-bootstrap.css';

import { duration } from 'moment';
import React, { FormEvent, useEffect, useRef, useState } from 'react';
import {
	ArrowCounterclockwise, BrushFill, PauseFill, PenFill, PlayFill, SendFill
} from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { createRoot } from 'react-dom/client';
import { Config, Configschema, ConnStatus, Countdown, StreamState, XrStatus } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
import { RecordFill, Wifi } from 'react-bootstrap-icons';
import Stack from 'react-bootstrap/Stack';

import { sendTo as sendToOBS } from '../../../obs/messages';
import { sendTo as sendToCountdown } from '../../../countdown/messages';
import { PreviewScene, ProgramScene, ObsStatus } from 'types/schemas';
import { Timer } from 'speedcontrol-util/types/speedcontrol/schemas/timer';
import type NodeCG from '@nodecg/types';
import { RunDataActiveRun, RunFinishTimes } from 'speedcontrol-util/types/speedcontrol';
import { msToTimeString } from 'countdown/utils';
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

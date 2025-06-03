import { msToApproxTimeString, msToTimeString } from '../../../../countdown/utils';
import './countdown.scss';

import { Countdown, CountdownText } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

export function CountdownComp() {
    const [countdown,] = useReplicant<Countdown>("countdown", { "value": 0, "state": "paused" });
    const [cdText] = useReplicant<CountdownText>("countdownText", "Back Soon");
    if (!countdown) return null;

    return <div className="countdown fw-semibold flex-grow-1">
        <div className="msg text-center">{cdText}</div>
        <div className="time tabnum text-center lh-1">{msToApproxTimeString(countdown.state == "running" ? countdown.value : 0)}</div>
    </div>
}
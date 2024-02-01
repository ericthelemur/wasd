import { Countdown } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

// m('.countdown-container', [
//     m('.countdown-label', 'BACK SOON'),
//     m('.countdown-time', vnode.attrs.countdown.display),
//   ]),

export function CountdownComp() {
    const [countdown,] = useReplicant<Countdown>("countdown", { "display": "00:00", "state": "paused", msg: "Back Soon" });
    if (!countdown) return null;
    return <div className="countdown">
        <div className="msg">{countdown.msg}</div>
        <div className="time">{countdown.display}</div>
    </div>
}
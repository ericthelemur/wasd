import '../../../common/uwcs-bootstrap.css';
import './bar.scss';
import '../../../common/custom.d';

import { Total } from 'nodecg-tiltify/src/types/schemas';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Current, Queue, Bank, MsgRef } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
import clone from 'clone';

import specialeffect from '../assets/specialeffect-small.png';
import logo from '../assets/wasd-w.svg';
import { formatAmount, timeFormat } from '../utils';

function VR() {
    return <div className="vr" />;
}

export function Bar() {
    const [total, _] = useReplicant<Total>("total", { "currency": "GBP", "value": 0 }, { namespace: "nodecg-tiltify" });

    const [time, setTime] = useState(timeFormat.format(Date.now()));

    useEffect(() => {
        const interval = setInterval(() => setTime(timeFormat.format(Date.now())), 10000);
        return () => clearInterval(interval);
    }, [setTime]);

    return (
        <div className='bar border-top'>
            <img className="logo" src={logo} />
            <h2>WASD 2024</h2>
            <VR />
            <img className="logo" src={specialeffect} />
            <h2 className="tabnum">{total && formatAmount(total)}</h2>
            <VR />
            <BarAnnouncement />
            <VR />
            <h2 className="tabnum">{time}</h2>
        </div >
    )
}

function Element({ msgref, onAnimationEnd }: { msgref: Current, onAnimationEnd: () => void }) {

    const elem = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        if (elem.current) {
            const now = Date.now();
            const elapsed = now - msgref.startTime;
            elem.current.style.animationDelay = String(elapsed) + "ms";
            elem.current.offsetWidth
            elem.current.style.setProperty("--animationDuration", String(2 * (msgref.endTime - msgref.startTime) / 1000) + "s");
            console.log(now, msgref.startTime, msgref.endTime, elem.current.style.animationDelay, elem.current.dataset.duration)
        }
    }, [msgref.startTime, msgref.endTime]);

    return <h2 ref={elem} className="element" onAnimationEnd={onAnimationEnd}>{msgref.text}</h2>
}

export function BarAnnouncement() {
    const [current,] = useReplicant<Current>("current", { "text": "", "msgID": null, "endTime": 0, "startTime": 0 });
    const [queue,] = useReplicant<Queue>("queue", { name: "Queue", priority: 0, msgs: [] });

    const [msgs, setMsgs] = useState<Current[]>([]);

    useEffect(() => {
        if (current && current.msgID) {
            setMsgs([...msgs, clone(current)])
        }
    }, [current?.msgID])

    function animEnd(m: Current) {
        // return () => setMsgs(msgs.filter(r => r.msgID != m.msgID || r.endTime != m.endTime));
        return () => { };
    }

    if (!queue || !queue.msgs) return <div>Empty</div>
    return <div className="wrapper">
        <div style={{ opacity: 0 }}>{"."}</div>
        {msgs.filter(m => m.msgID).map((m) =>
            <Element key={m.msgID! + m.endTime} msgref={m} onAnimationEnd={animEnd(m)} />)}
    </div>
}


const root = createRoot(document.getElementById('root')!);
root.render(<Bar />);

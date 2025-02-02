import '../../../common/uwcs-bootstrap.css';
import './bar.scss';
import '../../../common/custom.d';

import { Total } from 'types/schemas/tiltify';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Current } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import specialeffect from '../assets/specialeffect-small.png';
import logo from '../assets/wasd-w.svg';
import { AnimTextFit } from '../components/animtext';
import { formatAmount, formatTime } from 'common/utils/formats';

function VR() {
    return <div className="vr" />;
}

export function Bar() {
    const [total, _] = useReplicant<Total>("total", { "currency": "GBP", "value": 0 });
    const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric" });

    const [time, setTime] = useState(timeFormat.format(Date.now()));
    // const [time, setTime] = useState(formatTime(Date.now()));

    useEffect(() => {
        const interval = setInterval(() => setTime(timeFormat.format(Date.now())), 10000);
        // const interval = setInterval(() => setTime(formatTime(Date.now())), 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bar">
            <img className="logo" src={logo} />
            <span>WASD</span>
            <VR />
            <img className="logo" src={specialeffect} />
            <span className="tabnum">{total && formatAmount(total)}</span>
            <VR />
            <BarAnnouncement />
            <VR />
            <span className="tabnum">{time}</span>
        </div >
    )
}

export function BarAnnouncement() {
    const [current,] = useReplicant<Current>("current", { "text": "", "msgID": null, "endTime": 0 });
    return <AnimTextFit transitionName='fade-wait' enterTimeout={2000} leaveTimeout={2000} animKey={current?.msgID ?? ""} className="ticker">
        <span>{current?.text || ""}</span>
    </AnimTextFit>
}


const root = createRoot(document.getElementById('root')!);
root.render(<Bar />);

import 'wasd-common/shared/uwcs-bootstrap.css';
import './bar.scss';
import 'wasd-common/shared/custom.d';

import { Total } from 'nodecg-tiltify/src/types/schemas';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Current } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import specialeffect from '../assets/specialeffect-small.png';
import logo from '../assets/wasd-w.svg';
import { AnimTextFit } from '../components/animtext';
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

export function BarAnnouncement() {
    const [currentMsg, _] = useReplicant<Current>("current", { "text": "", "msgID": null, "endTime": 0 }, { namespace: "nodecg-ticker-control" });

    return <AnimTextFit transitionName='fade-wait' enterTimeout={400} animKey={currentMsg?.msgID ?? ""} className="ticker">
        <h2>{currentMsg?.text || ""}</h2>
    </AnimTextFit>
}


const root = createRoot(document.getElementById('root')!);
root.render(<Bar />);

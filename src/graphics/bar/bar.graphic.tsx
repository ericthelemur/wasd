import 'wasd-common/shared/uwcs-bootstrap.css';
import './bar.scss';
import 'wasd-common/shared/browser.d';

import { Current } from 'nodecg-ticker-control/src/types/schemas';
import { Total } from 'nodecg-tiltify/src/types/schemas';
import { useEffect, useState } from 'react';
import ReactCSSTransitionReplace from 'react-css-transition-replace';
import { createRoot } from 'react-dom/client';
import { Textfit } from 'react-textfit';
import { useReplicant } from 'use-nodecg';

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

export function BarAnnouncement() {
    const [currentMsg, _] = useReplicant<Current>("current", { "text": "", "msgID": null, "endTime": 0 }, { namespace: "nodecg-ticker-control" });

    return <ReactCSSTransitionReplace transitionName="fade-wait" transitionEnterTimeout={1000} transitionLeaveTimeout={400} className="ticker">
        <h2 key={currentMsg?.msgID || ""}>
            <Textfit mode="multi" style={{ height: "60px" }} className='text' max={32}>
                {currentMsg?.text || ""}
            </Textfit>
        </h2>
    </ReactCSSTransitionReplace >
}


const root = createRoot(document.getElementById('root')!);
root.render(<Bar />);

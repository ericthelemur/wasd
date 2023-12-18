import './bar.scss';

import { Total } from 'nodecg-tiltify/src/types/schemas';
import { CSSProperties, useEffect, useState } from 'react';
import { Announcement, CurrentAnnouncement } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
import ReactCSSTransitionReplace from 'react-css-transition-replace';

import specialeffect from '../assets/specialeffect-small.png';
import logo from '../assets/wasd-w.svg';
import { formatAmount, timeFormat } from '../utils';
import { Textfit } from 'react-textfit';

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
            <h2>{total && formatAmount(total)}</h2>
            <VR />
            <BarAnnouncement />
            <VR />
            <h2>{time}</h2>
        </div >
    )
}

export function BarAnnouncement() {
    const [currentAnnouncement, _] = useReplicant<CurrentAnnouncement>("currentAnnouncement", { "text": "", "annID": null, "endTime": 0 });

    return <ReactCSSTransitionReplace transitionName="fade-wait" transitionEnterTimeout={1000} transitionLeaveTimeout={400} className="announcement">
        <h2 key={currentAnnouncement?.annID || ""}>
            <Textfit mode="multi" style={{ height: "60px" }} className='text' max={32}>
                {currentAnnouncement?.text || ""}
            </Textfit>
        </h2>
    </ReactCSSTransitionReplace >
}
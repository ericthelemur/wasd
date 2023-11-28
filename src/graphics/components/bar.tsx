import './bar.scss';

import { Total } from 'nodecg-tiltify/src/types/schemas';
import { useReplicant } from 'use-nodecg';

import specialeffect from '../assets/specialeffect-small.png';
import logo from '../assets/wasd-w.svg';
import { formatAmount } from '../utils';

export function Bar() {
    const [total, _5] = useReplicant<Total>("total", { "currency": "GBP", "value": 0 }, { namespace: "nodecg-tiltify" });

    return (
        <div className='bar border-top'>
            <img className="logo" src={logo} />
            <h2>WASD 2024</h2>
            <div className="vr" />
            <img className="logo" src={specialeffect} />
            <h2>{total && formatAmount(total)}</h2>
        </div>
    )
}
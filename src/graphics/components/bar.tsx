import './bar.scss';

import logo2 from '../assets/wasd-w.png';
import logo from '../assets/wasd-w.svg';

export function Bar() {
    return (
        <div className='bar border-top'>
            <img className="logo" src={logo} />
            <img className="logo" src={logo2} />
        </div>
    )
}
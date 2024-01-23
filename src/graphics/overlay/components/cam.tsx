import './cam.scss';

import { CSSProperties } from 'react';

export function Camera({ camName, aspectRatio, width, style }: { camName: string, aspectRatio: string, width: number, style?: CSSProperties }) {
    return <div id={camName} className="cam" style={{ ...style }}>
        <div className="cam-inner" style={{ width: width, aspectRatio: aspectRatio }} />
    </div>
}
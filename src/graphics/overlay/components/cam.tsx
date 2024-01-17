import './cam.scss';

import { CSSProperties } from 'react';

export function Camera({ camName, aspectRatio, style }: { camName: string, aspectRatio: string, style?: CSSProperties }) {
    return <div id={camName} className="cam" style={{ aspectRatio: aspectRatio, ...style }}>
        <div className="centred-border" />
    </div>
}
import './cam.scss';

import { CSSProperties } from 'react';

export function Camera({ camName, aspectRatio, dims, style }: { camName: string, aspectRatio: string, dims?: [number | string | null, number | string | null], style?: CSSProperties }) {
    const dimsArgs: CSSProperties = {};
    if (dims && dims[0] !== null) dimsArgs.width = dims[0];
    if (dims && dims[1] !== null) dimsArgs.height = dims[1];
    return <div className="cam-border" style={{ ...style }}>
        <div id={camName} className="cam" style={{ ...dimsArgs, aspectRatio: aspectRatio }} />
    </div>
}
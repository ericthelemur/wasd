import './cam.scss';

import { CSSProperties } from 'react';

export function Camera({ camName, aspectRatio, dims, style }: { camName: string, aspectRatio: string, dims?: [number | string | null, number | string | null], style?: CSSProperties }) {
    const innerArgs: CSSProperties = {};
    const outerArgs: CSSProperties = {};
    if (dims && dims[0] !== null) {
        if (typeof dims[0] === "string" && dims[0].includes("%")) outerArgs.width = dims[0];
        else innerArgs.width = dims[0];
    }
    if (dims && dims[1] !== null) {
        if (typeof dims[1] === "string" && dims[1].includes("%")) outerArgs.height = dims[1];
        else innerArgs.height = dims[1];
    }
    return <div className="cam-border" style={{ ...outerArgs, ...style }}>
        <div id={camName} className="cam" style={{ ...innerArgs, aspectRatio: aspectRatio }} />
    </div>
}
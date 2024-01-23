import { getNodeCG } from 'extension/utils';
import { useState } from 'react';
import { Textfit } from 'react-textfit';
import { RunData, Timer } from 'speedcontrol-util/types/speedcontrol';
import { useReplicant } from 'use-nodecg';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

declare var nodecg: NodeCGAPIClient;

export function Game() {
    const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined, { namespace: "nodecg-speedcontrol" })
    const info = [activeRun?.category, activeRun?.system, activeRun?.release].filter(v => v);

    return <div className="h1 mb-0 p-3 w-0 flex-grow-1" style={{ fontSize: 10, height: "100%", overflow: "hidden" }}>
        <div className="wrapouter w-100" style={{ height: "100%", overflow: "hidden" }}>
            <Textfit max={200} mode="multi" className="w-100 text-center">
                {activeRun?.game}
                <div style={{ fontSize: "70%" }}>{info.join(" / ")}</div>
            </Textfit>
        </div>
    </div >;
}

export function TimerComp() {
    const [timer,] = useReplicant<Timer | undefined>("timer", undefined, { namespace: "nodecg-speedcontrol" })
    const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined, { namespace: "nodecg-speedcontrol" })
    if (!timer) return <></>
    return <div className="h1 m-3 text-center tabnum" style={{ fontSize: 72 }}>
        {timer?.time}
        <span className="ms-auto tabnum" style={{ fontSize: 26 }}>
            .{String(Math.trunc(timer?.milliseconds / 10) % 100).padStart(2, "0")}
        </span>
        <div style={{ fontSize: "0.4em" }}>
            Estimate: {activeRun?.estimate}
        </div>
    </div >;
}
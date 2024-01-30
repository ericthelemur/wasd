import { getNodeCG } from 'extension/utils';
import React, { Ref, useContext } from 'react';
import { RunData, Timer } from 'speedcontrol-util/types/speedcontrol';
import { useReplicant } from 'use-nodecg';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

import { SceneInfoContext } from '../overlay.graphic';
import { FittingText } from './FittingText';

declare var nodecg: NodeCGAPIClient;

export function Game({ vertical }: { vertical?: boolean }) {
    // const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined, { namespace: "nodecg-speedcontrol" })
    const sceneInfo = useContext(SceneInfoContext);
    const run = sceneInfo.run;
    const info = [run?.category, run?.system, run?.release].filter(v => v);

    return <div className={"position-relative flex-gs mb-0 " + (vertical ? "h-0 w-100" : "h-100 w-0")}>
        {run?.game && <FittingText className='text-center lh-sm text-wrap-balance'>
            {run?.game}
            <div style={{ marginTop: 3, fontSize: "60%" }}>{info.join(" / ")}</div>
        </FittingText>}
    </div >;
}

export function TimerComp() {
    const [timer,] = useReplicant<Timer | undefined>("timer", undefined, { namespace: "nodecg-speedcontrol" })
    const sceneInfo = useContext(SceneInfoContext);
    const run = sceneInfo.run;

    if (!timer) return <></>
    return <div className="h1 text-center tabnum" style={{ fontSize: 60 }}>
        {timer?.time}
        <span className="ms-auto tabnum" style={{ fontSize: 26 }}>
            .{String(Math.trunc(timer?.milliseconds / 10) % 100).padStart(2, "0")}
        </span>
        <div style={{ fontSize: "0.4em" }}>
            Estimate: {run?.estimate}
        </div>
    </div >;
}
import React, { Ref, useContext } from 'react';
import { RunData, Timer } from 'speedcontrol-util/types/speedcontrol';
import { useReplicant } from 'use-nodecg';

import { SceneInfoContext } from './cam';
import { FittingText } from './FittingText';

export function Game({ vertical }: { vertical?: boolean }) {
    // const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined, { namespace: "nodecg-speedcontrol" })
    const sceneInfo = useContext(SceneInfoContext);
    const run = sceneInfo.run;
    const info = [run?.category, run?.system, run?.release].filter(v => v);

    return <div className={"position-relative flex-gs mb-0 " + (vertical ? "h-0 w-100" : "h-100 w-0")}>
        {run?.game && <FittingText className='text-center lh-1 text-wrap-balance' max={72}>
            {run?.game}
            <div style={{ marginTop: 6, fontSize: "60%" }}>{info.join(" / ")}</div>
        </FittingText>}
    </div >;
}

export function TimerComp({ textfit }: { textfit?: boolean }) {
    const [timer,] = useReplicant<Timer | undefined>("timer", undefined, { namespace: "nodecg-speedcontrol" })
    const sceneInfo = useContext(SceneInfoContext);
    const run = sceneInfo.run;

    if (!timer || !run?.game) return <></>
    const content = <>
        {timer?.time}
        <span className="ms-auto tabnum" style={{ fontSize: "40%" }}>
            .{String(Math.trunc(timer?.milliseconds / 10) % 100).padStart(2, "0")}
        </span>
        <div style={{ fontSize: "40%" }}>
            Estimate: {run?.estimate}
        </div>
    </>

    if (textfit) {
        return <FittingText className='text-center lh-1 text-wrap-balance tabnum'>
            {content}
        </FittingText>
    } else {
        return <div className="h1 text-center tabnum" style={{ fontSize: 60 }}>
            {content}
        </div>
    }
}
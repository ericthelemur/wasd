import { getNodeCG } from 'extension/utils';
import { useEffect, useRef, useState } from 'react';
import { Textfit } from 'react-textfit';
import { RunData, Timer } from 'speedcontrol-util/types/speedcontrol';
import { useReplicant } from 'use-nodecg';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

declare var nodecg: NodeCGAPIClient;

export function Game({ vertical }: { vertical?: boolean }) {
    const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined, { namespace: "nodecg-speedcontrol" })
    const info = [activeRun?.category, activeRun?.system, activeRun?.release].filter(v => v);

    // Textfit apparently doesn't run on resize, so lazy update game on delay
    const [g, setG] = useState<string | undefined>(undefined);
    useEffect(() => {
        const t = setTimeout(() => setG(activeRun?.game), 1000)
        return () => clearTimeout(t);
    }, [activeRun]);

    return <div className={"position-relative flex-grow-1 mb-0 " + (vertical ? "h-0 w-100" : "h-100 w-0")}>
        <div style={{ position: "absolute", inset: 0 }} className="text-center p-3 lh-1 text-wrap-balance">
            {g && <Textfit max={200} mode="multi" className="h-100">
                {g}
                <div style={{ fontSize: "70%" }}>{info.join(" / ")}</div>
            </Textfit>}
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
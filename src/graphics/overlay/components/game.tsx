import { getNodeCG } from 'extension/utils';
import { Ref, useEffect, useRef, useState } from 'react';
import { Textfit } from 'react-textfit';
import { RunData, Timer } from 'speedcontrol-util/types/speedcontrol';
import { useReplicant } from 'use-nodecg';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

declare var nodecg: NodeCGAPIClient;

export function Game({ vertical }: { vertical?: boolean }) {
    const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined, { namespace: "nodecg-speedcontrol" })
    const info = [activeRun?.category, activeRun?.system, activeRun?.release].filter(v => v);

    // Textfit apparently doesn't run on resize, so lazy update game on delay
    const [g, setG] = useState(activeRun?.game);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            const observer = new ResizeObserver(() => setTimeout(() => setG(activeRun?.game ?? ""), 150));
            observer.observe(ref.current);
            return () => observer.disconnect();
        }
    }, [activeRun, ref]);

    return <div className={"position-relative flex-grow-1 mb-0 " + (vertical ? "h-0 w-100" : "h-100 w-0")}>
        <div ref={ref} style={{ position: "absolute", inset: 0, textAlign: "center", lineHeight: 1.05, textWrap: "balance" }}>
            <Textfit className="h-100 textfit" throttle={1}>
                {g}<div style={{ marginTop: 3, fontSize: "60%" }}>{info.join(" / ")}</div>
            </Textfit>
        </div>
    </div >;
}

export function TimerComp() {
    const [timer,] = useReplicant<Timer | undefined>("timer", undefined, { namespace: "nodecg-speedcontrol" })
    const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined, { namespace: "nodecg-speedcontrol" })
    if (!timer) return <></>
    return <div className="h1 text-center tabnum" style={{ fontSize: 60 }}>
        {timer?.time}
        <span className="ms-auto tabnum" style={{ fontSize: 26 }}>
            .{String(Math.trunc(timer?.milliseconds / 10) % 100).padStart(2, "0")}
        </span>
        <div style={{ fontSize: "0.4em" }}>
            Estimate: {activeRun?.estimate}
        </div>
    </div >;
}
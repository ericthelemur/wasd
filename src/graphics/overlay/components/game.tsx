import { getNodeCG } from 'extension/utils';
import { useState } from 'react';
import { Textfit } from 'react-textfit';
import SpeedcontrolUtil, { SpeedcontrolUtilBrowser } from 'speedcontrol-util';
import { NodeCGBrowser, NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';
import { RunData, Timer } from 'speedcontrol-util/types/speedcontrol';
import { useReplicant } from 'use-nodecg';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

declare var nodecg: NodeCGAPIClient;

export function GameDetails() {
    const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined, { namespace: "nodecg-speedcontrol" })
    const info = [activeRun?.category, activeRun?.system, activeRun?.release].filter(v => v);
export function TimerComp() {
    const [timer,] = useReplicant<Timer | undefined>("timer", undefined, { namespace: "nodecg-speedcontrol" })
    if (!timer) return <></>
    return <div className="h1 m-3 text-center tabnum" style={{ fontSize: 72 }}>
        {timer?.time}
        <span className="ms-auto tabnum" style={{ fontSize: 26 }}>
            .{String(Math.trunc(timer?.milliseconds / 10) % 100).padStart(2, "0")}
        </span>
    </div >;
}
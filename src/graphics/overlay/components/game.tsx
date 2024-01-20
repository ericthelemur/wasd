import { getNodeCG } from 'extension/utils';
import { useState } from 'react';
import { Textfit } from 'react-textfit';
import SpeedcontrolUtil, { SpeedcontrolUtilBrowser } from 'speedcontrol-util';
import { NodeCGBrowser, NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';
import { RunData } from 'speedcontrol-util/types/speedcontrol';
import { useReplicant } from 'use-nodecg';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

declare var nodecg: NodeCGAPIClient;

export function GameDetails() {
    const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined, { namespace: "nodecg-speedcontrol" })
    const info = [activeRun?.category, activeRun?.system, activeRun?.release].filter(v => v);
    return <div className="h1 m-3">
        <Textfit mode="single" max={56} className="text-center">
            {activeRun?.game}
        </Textfit>
        <Textfit mode="single" max={26} className="text-center">
            {info.join(" / ")}
        </Textfit>
    </div >;
}
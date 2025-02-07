import '../../../common/uwcs-bootstrap.css';
import '../overlay/overlay.graphic.scss';
import './comms.scss';

import { CSSProperties, PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';

import { RunDataArray } from 'speedcontrol-util/types/speedcontrol';
import { RunDataActiveRunSurrounding } from 'speedcontrol-util/types/speedcontrol/schemas';
import { useReplicant } from 'use-nodecg';

import { RunCard } from '../break/components/runcard';
import { Slides, UpNext } from '../break/components/slides';
import { Camera, SceneInfoContext } from '../overlay/components/cam';


function CurrentRun({ className }: { className?: string }) {
    const [runDataArray,] = useReplicant<RunDataArray>("runDataArray", [], { namespace: "nodecg-speedcontrol" });
    const [runDataActiveRunSurrounding,] = useReplicant<RunDataActiveRunSurrounding>("runDataActiveRunSurrounding", { previous: undefined, current: undefined, next: undefined }, { namespace: "nodecg-speedcontrol" });

    const runId = runDataActiveRunSurrounding?.current;
    const run = runDataArray && runId ? runDataArray.find(r => r.id === runId) : undefined;

    return <div className="text-center">
        <h1>{run ? "Current:" : "We're just getting started"}</h1>
        {run ? <RunCard run={run} delay={true} isNext={true} /> : ""}
    </div>
}

export function CommsBase({ children, width }: PropsWithChildren<{ width: number }>) {

    const style: CSSProperties = { width: width, maxHeight: 700, position: "relative" };

    return <div className="fill d-flex outer comms" style={{ fontFamily: "Montserrat", fontWeight: "600", fontSize: "1.75em" }}>
        <div className="d-flex justify-content-center align-items-center w-100">
            <div>
                <div className="hstack gap-4 justify-content-center align-items-center" style={style}>
                    {children}
                </div>
                <div className="mt-3 hstack gap-4 w-100" style={{ maxWidth: width }}>
                    <div className='flex-gs'>
                        <CurrentRun />
                    </div>
                    <div className='flex-gs'>
                        <UpNext />
                    </div>
                </div>

            </div>
            {/* <div style={{ width: 600, height: 900 }} className="mt-3">
                    <Slides side={true} />
                </div> */}
        </div>
    </div >
}
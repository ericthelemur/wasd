import '../../../common/uwcs-bootstrap.css';
import './overlay.graphic.scss';

import { PropsWithChildren } from 'react';
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

function Comms({ children }: PropsWithChildren<{}>) {

    return <SceneInfoContext.Provider value={{ name: "COMMS", run: null }}>
        <div className="fill d-flex outer comms" style={{ fontFamily: "Montserrat", fontWeight: "600", fontSize: "1.75em" }}>
            <div className="d-flex justify-content-center align-items-center w-100">
                <div style={{ width: 1200 }}>
                    <div className="hstack">
                        {children}
                    </div>
                    <div className="mt-3 hstack gap-4">
                        <div className='w-50'>
                            <CurrentRun />
                        </div>
                        <div className='w-50'>
                            <UpNext />
                        </div>
                    </div>

                </div>
                {/* <div style={{ width: 600, height: 900 }} className="mt-3">
                    <Slides side={true} />
                </div> */}
            </div>
        </div>
    </SceneInfoContext.Provider>
}

function COMMS() {
    return <Comms>
        <Camera key="CAM-COMMS" camName="CAM-COMMS" aspectRatio="16 / 9" />
    </Comms>
}

const root = createRoot(document.getElementById('root')!);
root.render(<COMMS />);

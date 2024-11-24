import '../../../common/uwcs-bootstrap.css';
import './overlay.graphic.scss';
import './components/people.scss';

import clone from 'clone';
import { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RunData } from 'speedcontrol-util/types/speedcontrol';
import { SceneData, SceneInfo } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import { Camera, SceneInfoContext } from './components/cam';
import { Game, TimerComp } from './components/game';
import { Sidebar } from './components/sidebar';
import SpecialEffect from '../assets/specialeffect-white.png';

declare const defaultScene: string | undefined;


interface URLParams {
    aspect: [number, number];
    scene: string | null;
}

function aspectParse(aspect: string | null): [number, number] {
    if (aspect) {
        try {
            const parts = aspect.split("-").map(v => Number.parseInt(v));
            return [parts[0], parts[1]]
        } catch { }
    }
    return [16, 9];
}

function fetchFromParams(): URLParams {
    const url = new URL(window.location.href);
    var params = url.searchParams;
    const aspect = params.get("aspect");
    var scene = params.get("scene");
    if (!scene && defaultScene) scene = defaultScene;
    return { aspect: aspectParse(aspect), scene: scene };
}

function Overlay({ aspect }: { aspect: [number, number] }) {
    const sceneInfo = useContext(SceneInfoContext);

    const infoInSidebar = 9 * aspect[0] < 16 * aspect[1];
    console.log(aspect, infoInSidebar);

    return <div className="fill d-flex outer flex-column h-100 justify-content-between" style={{ fontFamily: "Montserrat", fontWeight: "600" }}>
        {/* <Sidebar className="flex-gs" vertical={infoInSidebar} /> */}
        <div className="d-flex">
            <div style={{ width: "calc(50% + 0.5 * var(--bw))", marginRight: "calc(-1 * var(--bw))" }}>
                <Camera camName="GAME-1" aspectRatio={`${aspect[0]} / ${aspect[1]}`} />
            </div>
            <div style={{ width: "calc(50% + 0.5 * var(--bw))" }}>
                <Camera camName="GAME-2" aspectRatio={`${aspect[0]} / ${aspect[1]}`} />
            </div>
        </div>
        {/* <div style={{ position: "absolute", bottom: 0, height: "calc(287px + var(--bw))", left: 0, right: 0 }} className="d-flex flex-row"> */}
        <div className="d-flex flex-row flex-grow-1 flex-shrink-1" style={{ height: 300, marginTop: "calc(-1 * var(--bw))", maxHeight: 400 }}>
            <div style={{ aspectRatio: "4 / 3", height: "100%" }}>
                <Camera camName="CAM-1" aspectRatio="4 / 3" />
            </div>
            <div className="d-flex vcentre mx-3 my-3 gap-3 position-relative" style={{ flex: "1 1 0", paddingTop: "var(--bw)" }}>
                <div className="h-100 m-3 position-relative d-flex" style={{ width: "60%" }}>
                    <Game />
                </div>
                <div className="position-relative vstack" style={{ width: "40%" }}>
                    <div className="w-100 position-relative" style={{ height: "50%", flexShrink: 1 }}>
                        <TimerComp textfit={true} />
                    </div>
                    <div className="w-100 position-relative" style={{ height: "50%" }}>
                        <img src={SpecialEffect} className="h-100 w-100 object-fit-contain" />
                    </div>
                </div>
            </div>
            <div style={{ aspectRatio: "4 / 3", height: "100%" }}>
                <Camera camName="CAM-2" aspectRatio="4 / 3" />
            </div>
        </div>
    </div>
}

function OverlayWrapper() {
    const [{ aspect, scene },] = useState<URLParams>(fetchFromParams());
    const [sceneData,] = useReplicant<SceneData>("sceneData", {});
    const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined);

    const [info, setInfo] = useState<SceneInfo>({ name: "", run: null });

    useEffect(() => {
        if (sceneData && scene) {
            const info = sceneData[scene];
            if (info) {
                console.log("Set sceneinfo");
                setInfo(clone(info));
                return;
            }
        }
        setInfo({ name: "Default", run: clone(activeRun ?? null) });
    }, [sceneData, activeRun]);

    const runAspect = info.run?.customData.layout;
    return <SceneInfoContext.Provider value={info}>
        <Overlay aspect={runAspect ? aspectParse(runAspect) : aspect} />
    </SceneInfoContext.Provider>
}

const root = createRoot(document.getElementById('root')!);
root.render(<OverlayWrapper />);

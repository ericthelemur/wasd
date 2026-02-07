import '../../../common/uwcs-bootstrap.css';
import './overlay.graphic.scss';

import clone from 'clone';
import { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RunData } from 'speedcontrol-util/types/speedcontrol';
import { SceneData, SceneInfo } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import { Camera, SceneInfoContext } from './components/cam';
import { Game, TimerComp } from './components/game';
import { Sidebar } from './components/sidebar';

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

function VR() {
    return <div style={{ height: "100%", width: "var(--bw)", backgroundColor: "white" }} className="mv-5" />
}

function Overlay({ aspect }: { aspect: [number, number] }) {
    const sceneInfo = useContext(SceneInfoContext);

    const infoInSidebar = 9 * aspect[0] < 16 * aspect[1];
    console.log(aspect, infoInSidebar);

    return <div className="fill d-flex outer" style={{ fontFamily: "Montserrat", fontWeight: "600" }}>
        <Sidebar className="flex-gs" vertical={infoInSidebar} style={{ marginRight: "var(--bw)" }} />
        <div className="d-flex flex-column">
            <Camera camName={sceneInfo.name === "RUN-1" ? "GAME-1" : "GAME-2"} aspectRatio={`${aspect[0]} / ${aspect[1]}`} dims={infoInSidebar ? [null, 1010] : [1520, null]} style={{ borderRight: "none" }} />
            {!infoInSidebar && <div className="d-flex vcentre flex-gs px-4 py-2 gap-3" style={{ borderLeft: "var(--bw) white solid" }}>
                <Game />
                <VR />
                <TimerComp />
            </div>}
        </div>
    </div>
}

function OverlayWrapper() {
    const [{ aspect, scene },] = useState<URLParams>(fetchFromParams());
    const [sceneData,] = useReplicant<SceneData>("sceneData", {}, { namespace: "obs" });
    const [activeRun,] = useReplicant<RunData | undefined>("runDataActiveRun", undefined, { namespace: "nodecg-speedcontrol" });

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
        <Overlay aspect={aspect ? aspect : aspectParse(runAspect!)} />
    </SceneInfoContext.Provider>
}

const root = createRoot(document.getElementById('root')!);
root.render(<OverlayWrapper />);

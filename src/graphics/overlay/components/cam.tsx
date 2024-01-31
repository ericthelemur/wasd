import './cam.scss';

import { ListenerTypes as OBSMsgTypes } from 'nodecg-obs-control/src/common/listenerTypes';
import { ObsSource, SceneList } from 'nodecg-obs-control/src/types/schemas';
import { CSSProperties, useContext, useEffect, useRef, useState } from 'react';
import { useReplicant } from 'use-nodecg';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

import { SceneInfoContext } from '../overlay.graphic';

declare var nodecg: NodeCGAPIClient;

export function Camera({ camName, aspectRatio, dims, style }: { camName: string, aspectRatio: string, dims?: [number | string | null, number | string | null], style?: CSSProperties }) {
    const ref = useRef<HTMLDivElement>(null);

    const [lastPos, setLastPos] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const sceneInfo = useContext(SceneInfoContext);

    const [scenes,] = useReplicant<SceneList>("sceneList", [], { namespace: "nodecg-obs-control" });
    const [sceneSource, setSceneSource] = useState<ObsSource | null>(null);
    console.log("ss", sceneSource);


    // Find source ID from component name
    useEffect(() => {
        console.log("Scenes", scenes);
        if (!scenes) setSceneSource(null);
        else {
            const scene = scenes?.find(sc => sc.name === sceneInfo.name);
            console.log("Scene", scene?.name, scene?.sources);
            const src = scene?.sources?.find(sr => sr.sourceName === camName);
            console.log("src", src?.sourceName);
            if (!scene || !src) setSceneSource(null);
            else {
                setSceneSource(src);
            }
        }
    }, [scenes])

    // Send updates to OBS when cameras move
    useEffect(() => {
        const interval = setInterval(() => {
            console.log("poll", sceneSource);
            if (!sceneSource) return;
            const dims = ref.current!.getBoundingClientRect();
            if (dims.x !== lastPos.x || dims.y !== lastPos.y || dims.width !== lastPos.width || dims.height !== lastPos.height) {
                const newTransform = { x: dims.x, y: dims.y, height: dims.height, width: dims.width };
                console.log(newTransform, lastPos);
                setLastPos(newTransform);
                console.log("Moving", camName, "to", newTransform);
                nodecg.sendMessageToBundle("moveItem", "nodecg-obs-control", { sceneName: sceneInfo.name, sceneItemId: sceneSource.sceneItemId, transform: newTransform } as OBSMsgTypes["moveItem"])
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [ref, sceneSource, lastPos]);

    const innerArgs: CSSProperties = {};
    const outerArgs: CSSProperties = {};
    if (dims && dims[0] !== null) {
        if (typeof dims[0] === "string" && dims[0].includes("%")) outerArgs.width = dims[0];
        else innerArgs.width = dims[0];
    }
    if (dims && dims[1] !== null) {
        if (typeof dims[1] === "string" && dims[1].includes("%")) outerArgs.height = dims[1];
        else innerArgs.height = dims[1];
    }
    return <div className="cam-border" style={{ ...outerArgs, ...style }}>
        <div ref={ref} id={camName} className="cam" style={{ ...innerArgs, aspectRatio: aspectRatio }} />
    </div>
}
import './cam.scss';

import { it } from 'node:test';
import { ListenerTypes as OBSMsgTypes } from 'nodecg-obs-control/src/common/listenerTypes';
import { ObsSource, ObsTransform, SceneList } from 'nodecg-obs-control/src/types/schemas';
import { CSSProperties, useContext, useEffect, useRef, useState } from 'react';
import { useReplicant } from 'use-nodecg';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

import { SceneInfoContext } from '../overlay.graphic';

declare var nodecg: NodeCGAPIClient;

function fd(a: number, b: number, e: number = 1) {
    return Math.abs(a - b) < e;
}

function calculateTransform(ot: ObsTransform, t: { x: number, y: number, w: number, h: number }): Partial<ObsTransform> {
    // Calculate scale to fill
    const srcAspect = ot.sourceWidth / ot.sourceHeight;
    const newW = Math.max(t.w, t.h * srcAspect);
    const scale = newW / ot.sourceWidth;
    const newH = newW / srcAspect;
    // Calculate crop of excess
    const cropX = (newW - t.w) / scale;
    const cropY = (newH - t.h) / scale;
    return {
        positionX: t.x, positionY: t.y, scaleX: scale, scaleY: scale,
        cropLeft: cropX / 2, cropRight: cropX / 2, cropTop: cropY / 2, cropBottom: cropY / 2
    }
}

export function Camera({ camName, aspectRatio, dims, style }: { camName: string, aspectRatio: string, dims?: [number | string | null, number | string | null], style?: CSSProperties }) {
    const ref = useRef<HTMLDivElement>(null);

    const [lastPos, setLastPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
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
            if (!sceneSource) return;
            const dims = ref.current!.getBoundingClientRect();
            if (!fd(dims.x, lastPos.x) || !fd(dims.y, lastPos.y) || !fd(dims.width, lastPos.w) || !fd(dims.height, lastPos.h)) {
                const target = { x: dims.x, y: dims.y, w: dims.width, h: dims.height };
                const newTransform = calculateTransform(sceneSource.sceneItemTransform, target);
                setLastPos(target);
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
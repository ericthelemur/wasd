import './cam.scss';

import { it } from 'node:test';
import { ListenerTypes as OBSMsgTypes, sendTo, unlistenTo } from '../../../../obs/messages';
import { ObsSource, ObsTransform, SceneList } from 'types/schemas/obs';
import { createContext, CSSProperties, useContext, useEffect, useRef, useState } from 'react';
import { Cam, SceneInfo } from 'types/schemas/wasd';
import { useReplicant } from 'use-nodecg';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';
import { listenTo } from '../../../../obs/messages';

export const SceneInfoContext = createContext<SceneInfo>({ name: "Blank", run: null });

function fd(a: number, b: number, e: number = 1) {
    return Math.abs(a - b) < e;
}

function lerp(v0: number, v1: number, w: number) {
    return v0 + (v1 - v0) * w;
}

function calculateTransform(ot: ObsTransform, t: { x: number, y: number, w: number, h: number }, slide: number = 0.5, inset: number = 0): Partial<ObsTransform> {
    // Calculate scale to fill
    const srcAspect = ot.sourceWidth / ot.sourceHeight;
    const newW = Math.max(t.w, t.h * srcAspect);
    const scale = newW / ot.sourceWidth;
    const newH = newW / srcAspect;
    // Calculate crop of excess
    let cropX = (newW - t.w) / scale;
    let cropY = (newH - t.h) / scale;

    if (cropX < 1) cropX = 0;
    if (cropY < 1) cropY = 0;
    return {
        positionX: t.x, positionY: t.y, scaleX: scale, scaleY: scale,
        cropLeft: lerp(0, cropX, slide), cropRight: lerp(cropX, 0, slide), cropTop: lerp(0, cropY, slide), cropBottom: lerp(cropY, 9, slide)
    }
}

export function Camera({ camName, aspectRatio, dims, style, flexGrow }: { camName: string, aspectRatio: string, dims?: [number | string | null, number | string | null], style?: CSSProperties, flexGrow?: number }) {
    const ref = useRef<HTMLDivElement>(null);

    const sceneInfo = useContext(SceneInfoContext);
    const [scenes,] = useReplicant<SceneList>("sceneList", [], { namespace: "obs" });
    const [sceneSource, setSceneSource] = useState<ObsSource | null>(null);

    const [lastPos, setLastPos] = useState({ x: 0, y: 0, w: 0, h: 0 });

    // Find source ID from component name
    useEffect(() => {
        const scene = scenes?.find(sc => sc.name === sceneInfo.name);
        const src = scene?.sources?.find(sr => sr.sourceName === camName);
        setSceneSource(src ?? null);
    }, [scenes, sceneInfo])

    // Send updates to OBS when cameras move
    useEffect(() => {
        function moveOBSSrc(force: boolean = false) {
            if (!sceneSource) return;
            let d = ref.current!.getBoundingClientRect();
            const inset = 6;
            const dims = { x: d.x + inset, y: d.y + inset, width: d.width - 2 * inset, height: d.height - 2 * inset };
            if (force || (!fd(dims.x, lastPos.x) || !fd(dims.y, lastPos.y) || !fd(dims.width, lastPos.w) || !fd(dims.height, lastPos.h))) {
                const target = { x: dims.x, y: dims.y, w: dims.width, h: dims.height };
                const newTransform = calculateTransform(sceneSource.sceneItemTransform, target, 0.5, 6);
                setLastPos(target);
                sendTo("moveItem", { sceneName: sceneInfo.name, sceneItemId: sceneSource.sceneItemId, transform: newTransform });
            }
        }

        // Poll for movement on timer and force move on msg
        const interval = setInterval(moveOBSSrc, 1000);
        const forceF = () => moveOBSSrc(true);
        listenTo("moveOBSSources", forceF);

        return () => {
            clearInterval(interval);
            unlistenTo("moveOBSSources", forceF);
        };
    }, [ref, sceneSource, lastPos]);

    const camStyle: CSSProperties = { aspectRatio: aspectRatio };
    if (dims && dims[0] !== null) camStyle.width = dims[0];
    if (dims && dims[1] !== null) camStyle.height = dims[1];
    if (flexGrow) {
        camStyle.flexGrow = flexGrow;
        camStyle.flexShrink = flexGrow;
    }

    return <div ref={ref} id={camName} className="cam" style={{ ...camStyle, ...style }} />;
}



export function NewCamera({ cam, aspectRatio, dims, style, flexGrow }: { cam?: Cam, aspectRatio?: string, dims?: [number | string | null, number | string | null], style?: CSSProperties, flexGrow?: number }) {
    const ref = useRef<HTMLDivElement>(null);

    const sceneInfo = useContext(SceneInfoContext);
    const [scenes,] = useReplicant<SceneList>("sceneList", [], { namespace: "obs" });
    const [sceneSource, setSceneSource] = useState<ObsSource | null>(null);

    const calcAspectRatio = cam?.aspectRatio || aspectRatio || "16 / 9";
    const [lastPos, setLastPos] = useState({ x: 0, y: 0, w: 0, h: 0, crop: "center", aspectRatio: "16 / 9" });

    // Find source ID from component name
    useEffect(() => {
        if (!cam) return;
        const scene = scenes?.find(sc => sc.name === sceneInfo.name);
        const src = scene?.sources?.find(sr => sr.sourceName === cam.sourceName);
        setSceneSource(src ?? null);
    }, [scenes, sceneInfo])

    // Send updates to OBS when cameras move
    useEffect(() => {
        if (!cam) return;
        function moveOBSSrc(force: boolean = false) {
            if (!sceneSource) return;
            const crop = cam?.crop || "center";
            if (crop == "custom") return;
            let d = ref.current!.getBoundingClientRect();
            const inset = 6;
            const dims = { x: d.x + inset, y: d.y + inset, width: d.width - 2 * inset, height: d.height - 2 * inset };
            if (force || (!fd(dims.x, lastPos.x) || !fd(dims.y, lastPos.y) || !fd(dims.width, lastPos.w) || !fd(dims.height, lastPos.h) || crop != lastPos.crop || calcAspectRatio != lastPos.aspectRatio)) {
                const target = { x: dims.x, y: dims.y, w: dims.width, h: dims.height, crop: crop, aspectRatio: calcAspectRatio };
                const slide = crop == "start" ? 0 : crop == "center" ? 0.5 : 1.0;
                const newTransform = calculateTransform(sceneSource.sceneItemTransform, target, slide, 6);
                setLastPos(target);
                sendTo("moveItem", { sceneName: sceneInfo.name, sceneItemId: sceneSource.sceneItemId, transform: newTransform });
            }
        }

        // TODO check source for manual move

        // Poll for movement on timer and force move on msg
        const interval = setInterval(moveOBSSrc, 1000);
        const forceF = () => moveOBSSrc(true);
        listenTo("moveOBSSources", forceF);

        return () => {
            clearInterval(interval);
            unlistenTo("moveOBSSources", forceF);
        };
    }, [cam, ref, sceneSource, lastPos]);

    if (!cam) return;

    const camStyle: CSSProperties = { aspectRatio: calcAspectRatio };
    if (dims && dims[0] !== null) camStyle.width = dims[0];
    if (dims && dims[1] !== null) camStyle.height = dims[1];
    if (flexGrow) {
        camStyle.flexGrow = flexGrow;
        camStyle.flexShrink = flexGrow;
    }

    return <div ref={ref} id={cam.sourceName} className="cam" style={{ ...camStyle, ...style }} />;
}


export function NewStack({ stack, dims }: { stack: string, dims?: [number | string | null, number | string | null] }) {
    const sceneInfo = useContext(SceneInfoContext);
    const stackContent = sceneInfo.camStack && sceneInfo.camStack[stack];

    if (!sceneInfo || !stackContent || !stackContent.cams || !sceneInfo.cams) return;

    let gap: number | string | undefined = stackContent.gap;
    if (!gap) gap = "calc(-1 * var(--bw))";
    const gapProp: "marginTop" | "marginLeft" = stackContent.direction != "horizontal" ? "marginTop" : "marginLeft";
    const camStyle: CSSProperties = {};
    if (gap) {
        camStyle[gapProp] = gap;
    }

    return <div className={`d-flex ${stackContent.direction != "horizontal" ? "flex-column" : ""}`}>
        {stackContent.cams?.map((c, i) => <NewCamera key={c} cam={sceneInfo.cams && sceneInfo.cams[c]} dims={dims} style={i != 0 ? camStyle : {}} />)}
    </div>
}
import { OBSRequestTypes } from 'obs-websocket-js';
import { createMessageListenersBundle, createUnlistener } from '../common/messages';
import type { ObsTransform } from 'types/schemas';


type ToPairs<T> = { name: string, args: any } & { [K in keyof T]: { name: K; args: T[K]; } }[keyof T];

export type ListenerTypes = {
    connect: {
        ip: string,
        password: string
    },
    disconnect: undefined,
    connected: undefined,
    "DEBUG:callOBS": ToPairs<OBSRequestTypes>,

    transition: {
        sceneName?: string;
        transitionName?: string;
        transitionDuration?: number;
    },
    transitioning: {
        transitionName: string;
        fromScene?: string;
        toScene?: string;
    },
    preview: {
        sceneName: string;
    },
    moveOBSSources: undefined,
    moveItem: {
        sceneName: string;
        sceneItemId: number;
        transform: Partial<ObsTransform>
    },
    startRecording: undefined,
    stopRecording: undefined,
    refreshOBS: undefined
}

export const listeners = createMessageListenersBundle<ListenerTypes>("obs");
export default listeners;
export const { sendTo, sendToF, listenTo } = listeners;
export const unlistenTo = createUnlistener<ListenerTypes>("obs");
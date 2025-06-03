import { createMessageListeners } from '../common/messages';
import type { ObsTransform } from 'types/schemas';

export type ListenerTypes = {
    obsConnect: {
        ip: string,
        password: string
    },
    obsDisconnect: {},
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
    moveItem: {
        sceneName: string;
        sceneItemId: number;
        transform: Partial<ObsTransform>
    },
    startRecording: undefined,
    stopRecording: undefined,
    refreshOBS: undefined
}

export const { sendTo, sendToF, listenTo } = createMessageListeners<ListenerTypes>();
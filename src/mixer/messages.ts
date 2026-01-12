import { Login } from 'types/schemas/mixer';
import { createMessageListeners, createMessageListenersBundle, createUnlistener } from '../common/messages';
import { OscMessage } from 'osc';

export type ListenerTypes = {
    connect: Partial<Login>,
    disconnect: undefined,
    connected: undefined,
    "DEBUG:callOSC": OscMessage,

    "message": OscMessage,

    "setMute": {
        mic: string;
        muted: boolean;
    },

    "setTalkback": {
        mic: string;
        talkback: boolean;
        muted?: boolean;
    },

    "setTechMuted": {
        bus: string;
        muted: boolean;
    }
}

export const listeners = createMessageListenersBundle<ListenerTypes>("mixer", ["message"]);
export default listeners;
export const { sendTo, sendToF, listenTo } = listeners;
export const unlistenTo = createUnlistener<{ message: OscMessage }>("mixer");
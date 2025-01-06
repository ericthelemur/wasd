import { createMessageListeners } from '../common/messages';
import { OscMessage } from 'osc';

type ListenerTypes = {
    connect: {
        ip: string;
        localPort?: number;
    },
    disconnect: {},
    "DEBUG:callOSC": OscMessage,

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

export const { sendTo, sendToF, listenTo } = createMessageListeners<ListenerTypes>();
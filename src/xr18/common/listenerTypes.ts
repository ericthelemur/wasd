import { OscMessage } from 'osc';
import { Login } from 'types/schemas';

export type ListenerTypes = {
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

    "setTechMuted": {
        bus: string;
        muted: boolean;
    }
}
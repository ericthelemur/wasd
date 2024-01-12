import { OscMessage } from 'osc';
import { Login } from 'types/schemas';

export type ListenerTypes = {
    connect: {
        ip: string;
        localPort?: number;
    },
    disconnect: {},
    "DEBUG:callOSC": OscMessage
}
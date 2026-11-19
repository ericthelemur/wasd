import { createMessageListenersBundle } from '../common/messages';
import { Login } from '../types/schemas/loupedeck';

export type ListenerTypes = {
    "split": {
        teamId: string,
        forfeit: boolean
    },
    "undo": {
        teamId: string
    }
}

const listeners = createMessageListenersBundle<ListenerTypes>("external");
export default listeners;
export const { listenTo, sendTo, sendToF } = listeners;
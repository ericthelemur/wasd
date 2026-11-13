import { createMessageListenersBundle } from '../common/messages';
import { Login } from '../types/schemas/loupedeck';

export type ListenerTypes = {
    "createExternal": string,
    "removeExternal": string
}

const listeners = createMessageListenersBundle<ListenerTypes>("external");
export default listeners;
export const { listenTo, sendTo, sendToF } = listeners;
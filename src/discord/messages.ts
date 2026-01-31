import { Login } from 'types/schemas/discord';
import { createMessageListenersBundle, } from '../common/messages';

export type ListenerTypes = {
    connect: Partial<Login>,
    disconnect: undefined,
    connected: undefined,

    updateEvents: undefined
}

export const listeners = createMessageListenersBundle<ListenerTypes>("discord");
export default listeners;
export const { sendTo, sendToF, listenTo } = listeners;
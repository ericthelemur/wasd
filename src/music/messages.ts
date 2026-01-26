import { Login } from 'types/schemas/music';
import { createMessageListenersBundle, } from '../common/messages';

export type ListenerTypes = {
    connect: Partial<Login>,
    disconnect: undefined,
    connected: undefined,

    play: undefined,
    pause: undefined,
    skip: undefined
}

export const listeners = createMessageListenersBundle<ListenerTypes>("music");
export default listeners;
export const { sendTo, sendToF, listenTo } = listeners;
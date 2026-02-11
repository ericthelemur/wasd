import { createMessageListeners } from '../common/messages';
import { MsgRef } from 'types/schemas';

export type ListenerTypes = {
    "addMarkerTwitch": { name: string }
}

export const { sendTo, sendToF, listenTo } = createMessageListeners<ListenerTypes>();
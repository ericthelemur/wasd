import { createMessageListeners } from '../common/messages';
import { MsgRef } from 'types/schemas';

export type ListenerTypes = {

}

export const { sendTo, sendToF, listenTo } = createMessageListeners<ListenerTypes>();
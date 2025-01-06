import { createMessageListeners } from '../common/messages';
import { Person } from 'types/schemas';

export type ListenerTypes = {
    setPerson: {
        id: string,
        person: Person
    },
    loadRunners: {
        code: string
    }
}

export const { sendTo, sendToF, listenTo } = createMessageListeners<ListenerTypes>();
import { createMessageListeners } from "../../common/messages"

type ListenerTypes = {
    "countdown.start": undefined,
    "countdown.reset": undefined,
    "countdown.pause": undefined,
    "countdown.unpause": undefined,
    "countdown.add": number,
    "countdown.set": number
}

export const { sendTo, sendToF, listenTo } = createMessageListeners<ListenerTypes>();
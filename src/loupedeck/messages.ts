import { createMessageListeners } from '../common/messages';

type ListenerTypes = {
    "loupedeck.connect": undefined,
    "loupedeck.disconnect": undefined,

    "loupedeck.screenDown": { key: number },
    "loupedeck.screenUp": { key: number },

    "loupedeck.buttonDown": { button: number },
    "loupedeck.buttonUp": { button: number },

    "loupedeck.knobRotate": { knob: number, amount: number },
    "loupedeck.knobDown": { knob: number },
    "loupedeck.knobUp": { knob: number },
}

export const { sendTo, sendToF, listenTo } = createMessageListeners<ListenerTypes>();
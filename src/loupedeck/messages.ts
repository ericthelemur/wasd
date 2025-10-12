import { createMessageListenersBundle } from '../common/messages';
import { LoupeLogin } from '../types/schemas';

export type ListenerTypes = {
    "connect": Partial<LoupeLogin>,
    "disconnect": undefined,

    "screenDown": { key: number },
    "screenUp": { key: number },

    "buttonDown": { button: number },
    "buttonUp": { button: number },

    "knobRotate": { knob: number, amount: number },
    "knobDown": { knob: number },
    "knobUp": { knob: number },
}

const listeners = createMessageListenersBundle<ListenerTypes>("loupedeck");
export default listeners;
export const { listenTo, sendTo, sendToF } = listeners;
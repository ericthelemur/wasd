import { createMessageListenersBundle } from '../common/messages';
import { Login } from '../types/schemas/loupedeck';

export type ListenerTypes = {
    "connect": Partial<Login>,
    "disconnect": undefined,
    "connected": undefined,

    "setPage": string,

    "screenDown": { key: number },
    "screenUp": { key: number },

    "buttonDown": { button: number },
    "buttonUp": { button: number },

    "knobRotate": { knob: number, amount: number },
    "knobDown": { knob: number },
    "knobUp": { knob: number },

    "setButtonColour": { button: number, colour: [number, number, number] }
}

const listeners = createMessageListenersBundle<ListenerTypes>("loupedeck", ["setButtonColour"]);
export default listeners;
export const { listenTo, sendTo, sendToF } = listeners;
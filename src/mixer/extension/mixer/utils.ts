import type { MixerCommPoint } from './mixer';

let storedX32: MixerCommPoint;

export function storeX32(x32: MixerCommPoint) {
    storedX32 = x32;
}

export function getX32(): MixerCommPoint {
    return storedX32;
}

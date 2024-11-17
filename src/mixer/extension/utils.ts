import type { X32Utility } from './X32';

let storedX32: X32Utility;

export function storeX32(x32: X32Utility) {
    storedX32 = x32;
}

export function getX32(): X32Utility {
    return storedX32;
}

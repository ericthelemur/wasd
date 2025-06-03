
export type ModStatus = boolean | null;
export const APPROVED = true, UNDECIDED = null, CENSORED = false;

export function tripleState<T>(v: ModStatus, appVal: T, undecVal: T, cenVal: T): T {
    // Shorthand for setting a value for each of the 3 mod states
    return v === APPROVED ? appVal : (v === CENSORED ? cenVal : undecVal);
}

import { Amount, Donation } from 'types/schemas/tiltify/donations';

export const baseCurrFormat = (curr: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: curr });
export const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric" });
export const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", weekday: "short", month: "short" })

export function formatAmount(amt?: Amount) {
    if (!amt) return "-";
    return baseCurrFormat(amt.currency).format(Number(amt.value));
}


export function truncate(str: string, length: number) {
    if (str.length < length) return str;
    else return str.slice(0, length);
}


export interface DonoProp {
    dono: Donation
    hideButtons?: boolean;
}


export function sortMap<T, U>(rep: T[] | undefined, comp: undefined | ((a: T, b: T) => number), func: (t: T) => U, rev: boolean = false, limit: number = 1e9) {
    if (!rep) return [];
    const sorted = comp ? [...rep].sort(comp) : rep;
    const maybe_rev = rev ? sorted.reverse() : sorted;
    const l = Math.min(maybe_rev.length, limit);
    return maybe_rev.slice(0, l).map(func);
}


function sorter<T>(f: (t: T) => any, rev: boolean = false) {
    if (rev) return (a: T, b: T) => Number(f(b)) - Number(f(a))
    else return (a: T, b: T) => f(a) - f(b)
}

export function sortMapSingle<T, U>(rep: T[] | undefined, comp: (a: T) => number, func: (t: T) => U, rev: boolean = false, limit: number = 1e9) {
    return sortMap(rep, sorter(comp, rev), func, rev, limit);
}
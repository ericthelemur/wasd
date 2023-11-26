
import { Amount, Donation } from "nodecg-tiltify/src/types/schemas/donations";

export const baseCurrFormat = (curr: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: curr });
export const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric" });
export const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", weekday: "short", month: "short" })

export function formatAmount({ currency, value }: Amount) {
    return baseCurrFormat(currency).format(Number(value));
}

export function formatAmounts(base: Amount | undefined, display: Amount | undefined) {
    if (base === undefined) {
        if (display === undefined) return "-";
        else return formatAmount(display);
    } else {
        if (display === undefined) return formatAmount(base);
        else if (display.currency === base.currency) return formatAmount(base);
        else return `${formatAmount(base)} (${formatAmount(display)})`;

    }
}


export function truncate(str: string, length: number) {
    if (str.length < length) return str;
    else return str.slice(0, length);
}


export interface DonoProp {
    dono: Donation
}


function sortMap<T, U>(rep: T[] | undefined, comp: undefined | ((a: T, b: T) => number), func: (t: T) => U, rev: boolean = false) {
    if (!rep) return [];
    const sorted = comp ? [...rep].sort(comp) : rep;
    const maybe_rev = rev ? sorted.reverse() : sorted;
    return maybe_rev.map(func);
}


function sorter<T>(f: (t: T) => any, rev: boolean = false) {
    if (rev) return (a: T, b: T) => Number(f(b)) - Number(f(a))
    else return (a: T, b: T) => f(a) - f(b)
}

export function sortMapSingle<T, U>(rep: T[] | undefined, comp: (a: T) => number, func: (t: T) => U, rev: boolean = false) {
    return sortMap(rep, sorter(comp, rev), func, false);
}
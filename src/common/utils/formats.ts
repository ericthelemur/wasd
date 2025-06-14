

import { Amount, Donation } from 'types/schemas/tiltify';

export function baseCurrFormat(curr: string) {
    return new Intl.NumberFormat("en-GB", { style: 'currency', currency: curr, currencyDisplay: "narrowSymbol" });
}

export const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", weekday: "short", month: "short" })
export const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, hourCycle: "h12" });

export function formatTime(time: number | Date | undefined) {
    return timeFormat.format(time).replace(" ", "").replace(/^0:/, "12:");  // Hour Cycle seems to break sometimes, so force it
}


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
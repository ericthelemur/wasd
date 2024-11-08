
import { Amount, Donation } from 'nodecg-tiltify/src/types/schemas/donations';

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
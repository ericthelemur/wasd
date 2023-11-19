
import { Amount, Donation } from "nodecg-tiltify/src/types/schemas/donations";

export const baseCurrFormat = (curr: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: curr });
export const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric" });
export const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", weekday: "short", month: "short" })

export function getAmount({currency, value}: Amount) {
    return baseCurrFormat(currency).format(Number(value));
}


export interface DonoProp {
    dono: Donation
}
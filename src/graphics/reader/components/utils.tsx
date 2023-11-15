

export const baseCurrFormat = (curr: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: curr });
export const displayCurrFormat = baseCurrFormat(nodecg.bundleConfig.displayCurrency as string);
export const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric" });
export const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", weekday: "short", month: "short" })

export function getAmount(currency: string, value: string, disp: number | undefined) {
    // Format value for display
    const c1 = baseCurrFormat(currency).format(Number(value));
    if (currency == nodecg.bundleConfig.displayCurrency || disp === undefined) {
        return [c1, undefined]
    }
    return [c1, displayCurrFormat.format(disp)]
}
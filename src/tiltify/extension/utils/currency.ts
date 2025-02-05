import { getNodeCG } from "../../../common/utils";
import type { Donation } from 'types/schemas/tiltify';
import { donations } from "./replicants";

const nodecg = getNodeCG();

type ConversionRates = { [code: string]: number };

export var conversionRates: ConversionRates = {
    USD: 1.2457642727,
    AUD: 1.9958017872,
    BRL: 7.3077038198,
    CAD: 1.7930537577,
    DKK: 8.9145157206,
    EUR: 1.194551036,
    GBP: 1.0,
    JPY: 193.2566911842,
    MXN: 25.5583902512,
    NOK: 14.0488476995,
    NZD: 2.1984006411,
    PLN: 5.0183628982
};

if (nodecg.bundleConfig.freecurrencyapi_key) {
    fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${nodecg.bundleConfig.freecurrencyapi_key}&base_currency=${nodecg.bundleConfig.display_currency}`)
        .then((r) => r.json())
        .then((j) => {
            conversionRates = j.data;
            console.log(conversionRates);
            nodecg.log.info("Conversion rates loaded, refreshing all conversions");
            convertAll();
        });
} else convertAll();

function convertAll() {
    nodecg.log.info("Converting all values for donations");

    donations.value.forEach(convertValue);
}

export function convertValue(dono: Donation) {
    const disp = nodecg.bundleConfig.display_currency;
    if (disp === undefined) return;
    var val: Number;
    if (dono.amount.currency == disp) {
        val = Number(dono.amount.value)
    } else if (dono.amount.currency in conversionRates) {
        val = Number(dono.amount.value) / conversionRates[dono.amount.currency];
    } else return;
    if (!dono.displayAmount || dono.displayAmount.value !== val) {
        dono.displayAmount = {
            currency: disp,
            value: val.toString()
        }
    }
}
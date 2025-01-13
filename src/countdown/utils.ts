import { duration } from 'moment';

export function timeStringToMs(timeString: string | undefined) {
    if (!timeString) return 0;
    if (typeof timeString !== 'string') {
        throw new TypeError('Expected string');
    }

    const format = /^(\d{1,2}:){0,2}\d{1,2}$/;
    if (!format.test(timeString)) {
        throw new Error(`Bad timeString format ${timeString}`);
    }

    const parts = timeString.split(':').map(part => parseInt(part, 10)).reverse();

    return duration({ seconds: parts[0], minutes: parts[1], hours: parts[2] }).asMilliseconds();
}

export function msToTimeString(ms: number | undefined) {
    if (!ms) return "00:00";

    // const mins = Math.ceil(ms / (1000 * 60));
    // return `${mins} mins`

    const d = duration({ milliseconds: ms });

    return [(d.hours() || null), d.minutes(), d.seconds()]
        .filter(d => d !== null)
        .map(d => String(d).padStart(2, '0'))
        .join(':');
}


function pluralize(n: number, word: string) {
    if (n == 0) return "";
    if (n == 1) return `${n} ${word} `;
    return `${n}\u00A0${word}s `;
}

export function msToApproxTimeString(ms: number | undefined, short?: boolean) {
    if (!ms) return "Soon™";

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.ceil((ms / (1000 * 60)) % 60);
    return pluralize(hours, short ? "hr" : "hr") + pluralize(mins, "min");
}
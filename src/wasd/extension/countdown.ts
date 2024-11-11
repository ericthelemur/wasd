import { EventEmitter } from 'events';
import { duration } from 'moment';
import { Countdown } from 'types/schemas';

import { getNodeCG, Replicant } from '../../common/utils';
import { listenTo } from '../common/listeners';
import { countdown } from './replicants';

const nodecg = getNodeCG();

class CountdownTimer extends EventEmitter {
    state: "paused" | "running" | "ended";
    remainingMs: number;
    endTime: number = 0;
    interval: NodeJS.Timeout | undefined = undefined;

    constructor() {
        super();
        this.state = 'paused';
        this.remainingMs = 300000; // 5 min
    }

    timeStringToMs(timeString: string) {
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

    msToTimeString(ms: number) {
        if (typeof ms !== 'number') {
            throw new TypeError('Expected number');
        }

        // const mins = Math.ceil(ms / (1000 * 60));
        // return `${mins} mins`

        const d = duration({ milliseconds: ms });

        return [(d.hours() || null), d.minutes(), d.seconds()]
            .filter(d => d !== null)
            .map(d => String(d).padStart(2, '0'))
            .join(':');
    }

    update() {
        this.emit('tick', this.msToTimeString(this.remainingMs), this.state);
    }

    tick() {
        this.remainingMs = Math.max(this.endTime - Date.now(), 0);
        this.update();

        if (this.remainingMs === 0) {
            clearInterval(this.interval);
            this.remainingMs = 300000;
            this.state = 'ended';
            this.update();
        }
    }

    start(timeString: string) {
        try {
            this.endTime = this.timeStringToMs(timeString) + Date.now();
        } catch (e) {
            nodecg.log.info(e);
            this.endTime = Date.now();
        }

        clearInterval(this.interval);
        this.state = 'running';
        this.interval = setInterval(this.tick.bind(this), 100);
    }

    pause() {
        clearInterval(this.interval);
        this.state = 'paused';
        this.update();
    }
}

const instance = new CountdownTimer();
instance.on('tick', (display, state) => { countdown.value = { msg: countdown.value?.msg, display, state } });
instance.update(); //Broadcast paused state on startup

listenTo("countdown.start", ({ timeStr }) => instance.start(timeStr));
listenTo("countdown.pause", () => instance.pause());


import { EventEmitter } from 'events';

import { getNodeCG } from '../../common/utils';
import { listenTo } from '../messages';
import { countdown } from '../extension/replicants';

const nodecg = getNodeCG();
const log = new nodecg.Logger("count");

class CountdownTimer extends EventEmitter {
    state: "paused" | "running" | "ended" = "ended";
    remainingMs: number = 0;
    endTime: number = 0;
    interval: NodeJS.Timeout | undefined = undefined;

    constructor() {
        super();
        this._reset();
    }

    update() {
        this.emit('tick', this.remainingMs, this.state);
    }

    setRemaining(val: number) {
        this.remainingMs = val;
        this.endTime = Date.now() + val;
        log.info(`Setting timer to ${this.remainingMs}ms (${Math.round(this.remainingMs / 1000)}s) ending at ${new Date(this.endTime).toLocaleTimeString()}`);
        this.update();
    }

    tick() {
        this.remainingMs = Math.max(this.endTime - Date.now(), 0);

        log.debug("tick", this.state, this.endTime, this.remainingMs);
        if (this.remainingMs <= 0) {
            this._reset();
        }
        this.update();
    }

    pause() {
        clearInterval(this.interval);
        this.state = 'paused';
        this.update();
    }

    start() {
        this.state = 'running';
        this.setRemaining(this.remainingMs);
        this.interval = setInterval(this.tick.bind(this), 100);
        this.update();
    }

    _reset() {
        clearInterval(this.interval);
        this.state = "ended";
        this.setRemaining(5 * 60 * 1000);
    }

    add(ms: number) {
        this.setRemaining(this.remainingMs + ms);
    }
}

const instance = new CountdownTimer();
instance.on('tick', (value, state) => { countdown.value = { msg: countdown.value?.msg, display: "##:##", value, state } });
instance.update();

listenTo("countdown.start", () => instance.start());
listenTo("countdown.reset", () => instance._reset());
listenTo("countdown.pause", () => instance.pause());
listenTo("countdown.unpause", () => instance.start());
listenTo("countdown.add", (ms) => instance.add(ms));
listenTo("countdown.set", (ms) => instance.setRemaining(ms));


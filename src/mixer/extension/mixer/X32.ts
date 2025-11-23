// Modified from https://github.com/esamarathon/esa-layouts-shared/blob/master/extension/x32/src/index.ts
// MIT License from ESA

import osc, { OscMessage } from 'osc';
import { TypedEmitter } from 'tiny-typed-emitter';

import NodeCG from '@nodecg/types';

import { getNodeCG } from '../../../common/utils';
import { listenTo } from '../../messages';
import { login, status } from './replicants';

interface X32Events {
    'ready': () => void;
    'message': (msg: OscMessage) => void;
}

export class X32Utility extends TypedEmitter<X32Events> {
    private conn!: osc.UDPPort;
    private nodecg: NodeCG.ServerAPI;
    private log: NodeCG.Logger;

    private _ignoreConnectionClosedEvents = false;
    private _reconnectInterval: NodeJS.Timeout | undefined = undefined;
    private connectionTimeout: NodeJS.Timeout | undefined = undefined;
    private renewInterval: NodeJS.Timeout | undefined = undefined;

    faders: { [k: string]: number } = {};
    fadersExpected: {
        [k: string]: {
            value: number, increase: boolean, seenOnce: boolean
        }
    } = {};
    private fadersInterval: { [k: string]: NodeJS.Timeout } = {};

    private pendingReplies: { [address: string]: OscMessage } = {};

    constructor() {
        super();
        this.nodecg = getNodeCG();
        this.log = new this.nodecg.Logger("XR18");

        if (login.value.enabled) {
            status.once('change', newVal => {
                // If we were connected last time, try connecting again now.
                if (newVal && (newVal.connection === 'connected' || newVal.connection === 'connecting')) {
                    this.log.info("NodeCG was previously connected to XR18, reconnect");
                    status.value.connection = 'connecting';
                    setTimeout(() => this.connect(), 10);
                }
            });

            listenTo("connect", (li, ack) => {
                login.value = { ...login.value, ...li };
                this.connect();
                if (ack && !ack.handled) ack();
            });

            listenTo("disconnect", (li, ack) => {
                this._ignoreConnectionClosedEvents = true;
                clearTimeout(this.connectionTimeout);
                clearInterval(this._reconnectInterval);
                clearInterval(this.renewInterval);
                this.log.info("Disconnecting");
                try {
                    if (!this.conn) status.value.connection = "disconnected";
                    else this.conn.close();
                } catch (e) { this.log.error(e) }
                if (ack && !ack.handled) ack();
                this.log.info("Disconnected");
            });

            listenTo("DEBUG:callOSC", (msg, ack) => {
                this.pendingReplies[msg.address] = msg;
                this.conn.send(msg);

                const process = (m: OscMessage) => {
                    if (m.address === msg.address) {
                        this.log.info("Responding to DEBUG:callOSC of", m.address);
                        this.removeListener("message", process);
                        if (ack && !ack.handled) ack(null, m);
                    }
                };
                this.addListener("message", process);
                return process;
            });
        } else {
            status.value.connection = "disconnected";
        }
    }

    connect() {
        this.log.info('Setting up connection');
        status.value.connection = "connecting";

        this.conn = new osc.UDPPort({
            // localAddress: '0.0.0.0',
            // localPort: 55667,
            remoteAddress: login.value.ip,
            remotePort: login.value.port || 10024,
            metadata: true,
        });

        const origSend = this.conn.send.bind(this.conn);
        this.conn.send = (msg, address, port) => {
            this.log.info(`Sending ${JSON.stringify(msg)}`);
            origSend(msg, address, port);
        }

        this.conn.on('error', (err) => {
            if (!err.message.startsWith("A malformed type tag string was found while reading the arguments of an OSC message.")) {
                this.log.warn('Error on connection', err);
                this.log.debug('Error on connection:', err);
                // status.value.connection = "error";
            }
        });

        const startTimeout = (t?: number) => {
            try {
                clearTimeout(this.connectionTimeout);
                this.conn.send({ address: '/xremote', args: [] });
                this.conn.send({ address: '/status', args: [] });
                this.connectionTimeout = setTimeout(() => {
                    if (status.value.connection === "connected" || status.value.connection == "connecting") {
                        this.log.info("Connection timed out");
                        try {
                            this.conn.close();
                        } catch (e) { this.log.error(e) }
                    }
                }, t ?? 5000);
            } catch (e) {
                this.log.error(e);
            }
        }

        this.conn.on('message', this.processMessage.bind(this));

        this.conn.on('ready', () => {
            this.log.info('Connection ready');

            // Subscribe/renew to updates (must be done every <10 seconds).
            if (this.conn) startTimeout(8000);
            this.renewInterval = setInterval(() => {
                if (this.conn) startTimeout();
            }, 8 * 1000);
        });

        this.conn.on('close', () => {
            this.log.info('Connection closed');
            status.value.connection = "disconnected";
            clearInterval(this.renewInterval);
            this._reconnect();
        });

        this.conn.open();
    }

    private _reconnect() {
        if (this._reconnectInterval || status.value.connection === "connected") return;

        if (this._ignoreConnectionClosedEvents) {
            clearInterval(this._reconnectInterval);
            status.value.connection = "disconnected";
            return;
        }

        this.log.warn('Connection closed, will attempt to reconnect every 10 seconds.');
        this._reconnectInterval = setInterval(() => this.connect(), 10000);
    }

    connected() {
        return login.value.enabled && status.value.connection === "connected" && this.conn;
    }


    processMessage(message: osc.OscMessage) {
        if (!message.address.endsWith("/status")) this.log.info("Message recieved", message);

        this.emit("message", message);

        try {
            // Clear countdown to disconnect
            clearTimeout(this.connectionTimeout);
            if (message.address.endsWith("/status")) {
                // Only transfer to connected on a response to initial status ping
                if (status.value.connection === "connecting") {
                    status.value.connection = "connected";

                    this._ignoreConnectionClosedEvents = false;
                    clearInterval(this._reconnectInterval!);
                    this._reconnectInterval = undefined;
                    this.emit('ready');
                }
            }

            if (message.address.endsWith('/fader') || message.address.endsWith('/level')) {
                // Record fader
                const args = (message.args as { type: 'f', value: number }[])[0];
                this.faders[message.address] = args.value;

                // Smooth faders
                if (this.fadersExpected[message.address]) {
                    this.fadeCheck(message.address, args.value);
                }
            }
        } catch (err) {
            this.log.warn('Error parsing message');
            this.log.debug('Error parsing message:', err);
        }
    }


    sendMethod(msg: OscMessage) {
        this.pendingReplies[msg.address] = msg;
        this.conn.send(msg);

        return new Promise<OscMessage>((resolve, reject) => {
            const process = (m: OscMessage) => {
                if (m.address === msg.address) {
                    this.removeListener("message", process);
                    delete this.pendingReplies[msg.address];
                    resolve(m);
                }
            };

            this.addListener("message", process);
        })
    }

    /**
     * Just set a specific fader to the supplied value.
     * @param name Full name of fader (example: /dca/1/fader).
     * @param startValue Value to set (0.0 - 1.0).
     */
    setFader(name: string, value: number): void {
        if (!this.connected()) {
            throw new Error('No connection available');
        }

        this.log.debug(`Attempting to set fader on ${name} to ${value}`);
        this.conn.send({
            address: '/subscribe',
            args: [{ type: 's', value: name }, { type: 'i', value: 0 }],
        });
        this.conn.send({ address: name, args: [{ type: 'f', value }] });
    }

    /**
     * Fades up/down the supplied fader using the specified settings.
     * @param name Full name of fader (example: /dca/1/fader).
     * @param startValue Value to start at (0.0 - 1.0).
     * @param endValue Value to end at (0.0 - 1.0).
     * @param length Milliseconds to spend doing fade.
     */
    fade(name: string, startValue: number | null, endValue: number, length: number): void {
        if (!this.connected()) {
            throw new Error('No connection available');
        }

        if (!startValue) {
            startValue = this.faders[name];
        }

        // Will stop doing a fade if we receive another one while the old one is running, for safety.
        if (this.fadersExpected[name]) {
            clearInterval(this.fadersInterval[name]);
            delete this.fadersExpected[name];
        }

        this.log.debug(`Attempting to fade ${name} `
            + `(${startValue} => ${endValue}) for ${length}ms`);

        if (startValue) this.runFade(name, startValue, endValue, length);
        else {
            this.log.info(`No start value for ${name}, looking up fader`);
            const msg = { address: name, args: [] };
            this.pendingReplies[name] = msg;
            this.conn.send(msg);

            const process = (m: OscMessage) => {
                if (m.address === msg.address) {
                    this.removeListener("message", process);
                    startValue = (m.args as { type: 'f', value: number }[])[0].value;
                    this.log.info(`Looked up value ${startValue} for ${name}, starting fade`);
                    this.runFade(name, startValue, endValue, length);
                }
            };
            this.addListener("message", process);
        }
    }

    lerp(v1: number, v2: number, w: number) {
        return v1 * (1 - w) + v2 * w;
    }

    runFade(name: string, startValue: number, endValue: number, length: number) {
        if (Math.abs(startValue - endValue) < 0.01) {
            this.conn.send({ address: name, args: [{ type: 'f', value: endValue }] });
            this.log.info("Start and end values are too close together, no fade!");
            return;
        }
        let currentValue = startValue;
        const increase = startValue < endValue;
        const stepCount = length / 100;     // 10 steps per sec
        this.fadersExpected[name] = { value: endValue, increase, seenOnce: false };
        this.conn.send({
            address: '/subscribe',
            args: [{ type: 's', value: name }, { type: 'i', value: 0 }],
        });

        let stepIndex = 0;
        this.fadersInterval[name] = setInterval(() => {
            stepIndex++;
            if (stepIndex >= stepCount || (increase && currentValue >= endValue) || (!increase && currentValue <= endValue)) {
                // if ((increase && currentValue >= endValue - 0.05) || (!increase && currentValue <= endValue + 0.05)) {
                clearInterval(this.fadersInterval[name]);
                delete this.fadersExpected[name];

                this.conn.send({ address: name, args: [{ type: 'f', value: endValue }] });
            } else {
                currentValue = this.lerp(startValue, endValue, stepIndex / stepCount);

                if (this.conn) {
                    this.conn.send({ address: name, args: [{ type: 'f', value: currentValue }] });
                }
            }
        }, 100);
    }

    fadeCheck(address: string, value: number) {
        // Check if fading has finished
        const exp = this.fadersExpected[address];

        // Sometimes we receive a delayed message, so we wait until
        // we've at least seen 1 value in the correct range.
        if ((exp.increase && exp.value > value)
            || (!exp.increase && exp.value < value)) {
            exp.seenOnce = true;
        }
        if (exp.seenOnce && ((exp.increase && exp.value <= value)
            || (!exp.increase && exp.value >= value))) {
            // if (exp.seenOnce && ((exp.increase && exp.value <= value - 0.05)
            //     || (!exp.increase && exp.value >= value + 0.05))) {
            if (this.conn) {
                this.conn.send({
                    address: address,
                    args: [{ type: 'f', value: exp.value }],
                });
            }
            clearInterval(this.fadersInterval[address]);
            delete this.fadersExpected[address];
        }
    }


    async incrementFader(addr: string, amount: number) {
        if (!this.conn) return;
        return await this.sendMethod({ "address": addr, args: [] })
            .then(({ args }) => {
                const argsCast = args as [{ type: 'f', value: number }];
                this.conn.send({ "address": addr, args: [{ type: "f", value: argsCast[0].value + amount }] })
            }).catch(e => this.log.error(`Error incrementing fader ${addr} by ${amount}: ${e}`));
    }
}

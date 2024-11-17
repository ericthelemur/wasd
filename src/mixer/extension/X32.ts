// Modified from https://github.com/esamarathon/esa-layouts-shared/blob/master/extension/x32/src/index.ts
// MIT License from ESA

import type NodeCGTypes from '@nodecg/types';
import { getNodeCG } from 'common/utils';
import osc, { OscMessage } from 'osc';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Channels, Login, Muted, TechMuted, XrStatus } from 'types/schemas';

import NodeCG from '@nodecg/types';

import { listenTo, sendTo } from '../common/listeners';
import { login, status } from './replicants';

interface X32Events {
    'ready': () => void;
    'message': (msg: OscMessage) => void;
}

const nodecg = getNodeCG();

export class X32Utility extends TypedEmitter<X32Events> {
    private conn!: osc.UDPPort;

    private _ignoreConnectionClosedEvents = false;
    private _reconnectInterval: NodeJS.Timeout | undefined = undefined;
    private connectionTimeout: NodeJS.Timeout | undefined = undefined;

    faders: { [k: string]: number } = {};
    fadersExpected: {
        [k: string]: {
            value: number, increase: boolean, seenOnce: boolean,
        }
    } = {};
    private fadersInterval: { [k: string]: NodeJS.Timeout } = {};

    private pendingReplies: { [address: string]: OscMessage } = {};

    constructor() {
        super();

        if (login.value.enabled) {
            status.once('change', newVal => {
                // If we were connected last time, try connecting again now.
                if (newVal && (newVal.connection === 'connected' || newVal.connection === 'connecting')) {
                    nodecg.log.info("NodeCG was previously connected to XR18, reconnect");
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
                try {
                    this.conn.close();
                } catch (e) { nodecg.log.error(e) }
                if (ack && !ack.handled) ack();
            });

            listenTo("DEBUG:callOSC", (msg, ack) => {
                this.pendingReplies[msg.address] = msg;
                this.conn.send(msg);

                const process = (m: OscMessage) => {
                    if (m.address === msg.address) {
                        nodecg.log.info("Responding to DEBUG:callOSC of", m.address);
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
        nodecg.log.info('[X32] Setting up connection');
        status.value.connection = "connecting";

        this.conn = new osc.UDPPort({
            localAddress: '0.0.0.0',
            localPort: login.value.localPort,
            remoteAddress: login.value.ip,
            remotePort: login.value.xr18 ? 10024 : 10023,
            metadata: true,
        });

        this.conn.on('error', (err) => {
            if (!err.message.startsWith("A malformed type tag string was found while reading the arguments of an OSC message.")) {
                nodecg.log.warn('[X32] Error on connection');
                nodecg.log.debug('[X32] Error on connection:', err);
                // status.value.connection = "error";
            }
        });

        const startTimeout = (t?: number) => {
            clearTimeout(this.connectionTimeout);
            this.conn.send({ address: '/xremote', args: [] });
            this.conn.send({ address: '/status', args: [] });
            this.connectionTimeout = setTimeout(() => {
                if (status.value.connection === "connected" || status.value.connection == "connecting") {
                    nodecg.log.info("[X32] Connection timed out");
                    try {
                        this.conn.close();
                    } catch (e) { nodecg.log.error(e) }
                }
            }, t ?? 5000);
        }

        this.conn.on('message', (message) => {
            // I don't trust myself with all posibilities, so wrapping this up.
            if (!message.address.endsWith("/status")) nodecg.log.info("[X32] Message recieved", message);

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

                // Smooth faders
                if (message.address.endsWith('/fader') || message.address.endsWith('/level')) {
                    this.checkFaders(message);
                }
            } catch (err) {
                nodecg.log.warn('[X32] Error parsing message');
                nodecg.log.debug('[X32] Error parsing message:', err);
            }
        });

        var renewInterval: NodeJS.Timeout;
        this.conn.on('ready', () => {
            nodecg.log.info('[X32] Connection ready');

            // Subscribe/renew to updates (must be done every <10 seconds).
            if (this.conn) startTimeout(3000);
            renewInterval = setInterval(() => {
                if (this.conn) startTimeout();
            }, 8 * 1000);
        });

        this.conn.on('close', () => {
            nodecg.log.info('[X32] Connection closed');
            status.value.connection = "disconnected";
            clearInterval(renewInterval);
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

        nodecg.log.warn('Connection closed, will attempt to reconnect every 10 seconds.');
        this._reconnectInterval = setInterval(() => this.connect(), 10000);
    }

    connected() {
        return login.value.enabled && status.value.connection === "connected" && this.conn;
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

        nodecg.log.debug(`[X32] Attempting to set fader on ${name} to ${value}`);
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
            throw new Error('No Start Value');
        }

        // Will stop doing a fade if we receive another one while the old one is running, for safety.
        if (this.fadersExpected[name]) {
            clearInterval(this.fadersInterval[name]);
            delete this.fadersExpected[name];
        }

        nodecg.log.debug(`[X32] Attempting to fade ${name} `
            + `(${startValue} => ${endValue}) for ${length}ms`);
        let currentValue = startValue;
        const increase = startValue < endValue;
        const stepCount = length / 100;
        const stepSize = (endValue - startValue) / stepCount;
        this.fadersExpected[name] = { value: endValue, increase, seenOnce: false };
        this.conn.send({
            address: '/subscribe',
            args: [{ type: 's', value: name }, { type: 'i', value: 0 }],
        });
        this.fadersInterval[name] = setInterval(() => {
            if ((increase && currentValue >= endValue) || (!increase && currentValue <= endValue)) {
                clearInterval(this.fadersInterval[name]);
                delete this.fadersExpected[name];
            }
            if (this.conn) {
                this.conn.send({ address: name, args: [{ type: 'f', value: currentValue }] });
            }
            currentValue += stepSize;
            if ((increase && currentValue > endValue) || (!increase && currentValue < endValue)) {
                currentValue = endValue;
            }
        }, 100);
    }

    checkFaders(message: osc.OscMessage) {
        const args = (message.args as { type: 'f', value: number }[])[0];
        this.faders[message.address] = args.value;

        // Check if we're done fading and clear intervals if needed.
        if (this.fadersExpected[message.address]) {
            const exp = this.fadersExpected[message.address];

            // Sometimes we receive a delayed message, so we wait until
            // we've at least seen 1 value in the correct range.
            if ((exp.increase && exp.value > args.value)
                || (!exp.increase && exp.value < args.value)) {
                exp.seenOnce = true;
            }
            if (exp.seenOnce && ((exp.increase && exp.value <= args.value)
                || (!exp.increase && exp.value >= args.value))) {
                if (this.conn) {
                    this.conn.send({
                        address: message.address,
                        args: [{ type: 'f', value: exp.value }],
                    });
                }
                clearInterval(this.fadersInterval[message.address]);
                delete this.fadersExpected[message.address];
            }
        }
    }
}



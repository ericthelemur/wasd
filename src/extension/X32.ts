// Modified from https://github.com/esamarathon/esa-layouts-shared/blob/master/extension/x32/src/index.ts
// MIT License from ESA

import type NodeCGTypes from '@nodecg/types';
import osc, { OscMessage } from 'osc';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Login, XrStatus } from 'types/schemas';

import NodeCG from '@nodecg/types';

import { listenTo, sendTo } from '../common/listeners';
import { Replicant } from './utils';

interface X32Events {
    'ready': () => void;
    'message': (msg: OscMessage) => void;
}

export class X32Utility extends TypedEmitter<X32Events> {
    private nodecg: NodeCGTypes.ServerAPI;
    private conn!: osc.UDPPort;

    status: NodeCG.ServerReplicantWithSchemaDefault<XrStatus>;
    login: NodeCG.ServerReplicantWithSchemaDefault<Login>;
    private _ignoreConnectionClosedEvents = false;
    private _reconnectInterval: NodeJS.Timeout | null = null;

    faders: { [k: string]: number } = {};
    fadersExpected: {
        [k: string]: {
            value: number, increase: boolean, seenOnce: boolean,
        }
    } = {};
    private fadersInterval: { [k: string]: NodeJS.Timeout } = {};

    private pendingReplies: { [address: string]: OscMessage } = {};

    constructor(nodecg: NodeCGTypes.ServerAPI) {
        super();
        this.nodecg = nodecg;
        this.login = Replicant("login");
        this.status = Replicant("xrStatus");

        if (this.login.value.enabled) {
            this.connect();

            listenTo("connect", (login, ack) => {
                this.login.value = { ...this.login.value, ...login };
                this.connect();
                if (ack && !ack.handled) ack();
            });

            listenTo("disconnect", (login, ack) => {
                this._ignoreConnectionClosedEvents = true;
                this.conn.close();
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
            this.status.value.connected = false;
        }
    }

    connect() {
        const nodecg = this.nodecg;
        nodecg.log.info('[X32] Setting up connection');

        this.conn = new osc.UDPPort({
            localAddress: '0.0.0.0',
            localPort: this.login.value.localPort,
            remoteAddress: this.login.value.ip,
            remotePort: this.login.value.xr18 ? 10024 : 10023,
            metadata: true,
        });

        this.conn.on('error', (err) => {
            nodecg.log.warn('[X32] Error on connection');
            nodecg.log.debug('[X32] Error on connection:', err);
            this.status.value.connected = false;
        });

        this.conn.on('message', (message) => {
            // I don't trust myself with all posibilities, so wrapping this up.
            nodecg.log.debug("[X32] Message recieved", message);

            if (this.pendingReplies[message.address]) {
                this.emit("message", message);
                delete this.pendingReplies[message.address];
            }

            try {
                if (message.address.endsWith('/fader') || message.address.endsWith('/level')) {
                    this.checkFaders(message);
                }
            } catch (err) {
                nodecg.log.warn('[X32] Error parsing message');
                nodecg.log.debug('[X32] Error parsing message:', err);
            }
        });

        this.conn.on('open', () => {
            nodecg.log.info('[X32] Connection opened');
        });

        var renewInterval: NodeJS.Timeout;
        this.conn.on('ready', () => {
            nodecg.log.info('[X32] Connection ready');

            // Subscribe/renew to updates (must be done every <10 seconds).
            if (this.conn) this.conn.send({ address: '/xremote', args: [] });
            renewInterval = setInterval(() => {
                if (this.conn) this.conn.send({ address: '/xremote', args: [] });
            }, 8 * 1000);

            this.status.value.connected = true;
            this.emit('ready');

            this._ignoreConnectionClosedEvents = false;
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;
        });

        this.conn.on('close', () => {
            nodecg.log.info('[X32] Connection closed');
            this.status.value.connected = false;
            clearInterval(renewInterval);
            this._reconnect();
        });

        this.conn.open();
    }

    private _reconnect() {
        if (this._reconnectInterval || this.status.value.connected) return;

        if (this._ignoreConnectionClosedEvents) {
            this.status.value.connected = false;
            return;
        }

        this.nodecg.log.warn('Connection closed, will attempt to reconnect every 5 seconds.');
        this._reconnectInterval = setInterval(this.connect, 5000);
    }

    connected() {
        return this.login.value.enabled && this.status.value.connected && this.conn;
    }

    sendMethod(msg: OscMessage) {
        this.pendingReplies[msg.address] = msg;
        this.conn.send(msg);


        return new Promise((resolve, reject) => {
            const process = (m: OscMessage) => {
                if (m.address === msg.address) {
                    this.removeListener("message", process);
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

        this.nodecg.log.debug(`[X32] Attempting to set fader on ${name} to ${value}`);
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
    fade(name: string, startValue: number, endValue: number, length: number): void {
        if (!this.connected()) {
            throw new Error('No connection available');
        }

        // Will stop doing a fade if we receive another one while the old one is running, for safety.
        if (this.fadersExpected[name]) {
            clearInterval(this.fadersInterval[name]);
            delete this.fadersExpected[name];
        }

        this.nodecg.log.debug(`[X32] Attempting to fade ${name} `
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
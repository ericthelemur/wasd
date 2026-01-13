import osc, { Arguments, F, OscMessage } from 'osc';
import { Channels, Login, Muted, Status, TechMuted } from 'types/schemas/mixer';
import { CommPoint } from '../../../common/commpoint/commpoint';
import { AllNulls, NoNulls, sendSuccess } from '../../../common/utils';
import listeners, { ListenerTypes, listenTo, sendTo } from '../../messages';

const replicants = {
    status: null as null | Status,
    login: null as null | Login,

    muted: null as null | Muted,
    techMuted: null as null | TechMuted,
    channels: null as null | Channels
}

export type Replicants = NoNulls<typeof replicants>;
const replicantNamesOnly = replicants as AllNulls<typeof replicants>;

export class MixerCommPoint extends CommPoint<ListenerTypes, Replicants> {
    private conn!: osc.UDPPort;

    // Refreshes fader subscription every 8 seconds
    private resubscribeInterval?: NodeJS.Timeout;
    // Marks if recieved message in last subscription period
    private hasRecievedMessage = true;
    // Records in progress fades (only kept to halt overlapping fades)
    private faderIntervals: { [k: string]: NodeJS.Timeout } = {};

    constructor() {
        super("mixer", replicantNamesOnly, listeners);
    }

    async _connect() {
        const login = this.replicants.login;
        this.conn = new osc.UDPPort({
            remoteAddress: login.value.ip,
            remotePort: login.value.port || 10024,
            metadata: true,
            localPort: 0    // Should open a random open port
        });
        this.conn.open();

        // Log sending traffic (wrap base send function with log)
        const baseSend = this.conn.send.bind(this.conn);
        this.conn.send = (msg, address, port) => {
            this.log.info(`Sending to mixer ${JSON.stringify(msg)}`);
            baseSend(msg, address, port);
        }

        // Register listener
        this.conn.on("message", this.checkResponsePromises.bind(this));

        // Ensure response before marking as connected (UDP just assumes connected)
        await this.sendToMixer({ address: '/status', args: [] });
    }

    async _setupListeners() {
        // For mixer debugging, remove sometime lol
        listenTo("DEBUG:callOSC", async (msg, ack) => {
            if (!(await this.isConnected())) return;
            this.conn.send(msg);

            this.sendToMixer(msg).then(m => {
                this.log.info("Responding to DEBUG:callOSC of", m.address);
                sendSuccess(ack, m.args);
            }).catch(e => this.log.error("Error responding to DEBUG:callOSC of", msg.address, ": ", e));
        });

        this.conn.on('message', (message) => {
            this.log.info("Recieved from mixer", message);
            this.hasRecievedMessage = true;     // Mark as recieved a (/any) message
            sendTo("message", message);

            // try {
            //     if (message.address.endsWith('/fader') || message.address.endsWith('/level')) {
            //         // Record fader
            //         const args = (message.args as { type: 'f', value: number }[])[0];
            //         this.faders[message.address] = args.value;
            //     }
            // } catch (err) {
            //     this.log.warn('Error parsing message');
            //     this.log.debug('Error parsing message:', err);
            // }
        });

        this.conn.on('error', (err) => {
            if (!err.message.startsWith("A malformed type tag string was found while reading the arguments of an OSC message.")) {
                this.log.warn('Error on connection', err);
                this.log.debug('Error on connection:', err);
                // status.value.connected = "error";
            }
        });

        this.resubscribeInterval = setInterval(async () => {
            if (await this.isConnected()) this.resubscribeToUpdates();
        }, 8 * 1000);
    }

    async resubscribeToUpdates() {
        // hasRecievedMessage is set true when any message is recieved
        // If not set since last poll, must be something wrong
        try {
            if (!this.hasRecievedMessage && await this.isConnected()) {
                this.log.error("Connection has timed out, no messages recieved");
                this.reconnect();
            }
            this.hasRecievedMessage = false;
            this.conn.send({ address: '/xremote', args: [] });
            this.conn.send({ address: '/status', args: [] });
        } catch (e) {
            this.log.error(e);
        }
    }


    async _disconnect() {
        clearInterval(this.resubscribeInterval);
        if (!this.conn) return;
        try {
            this.conn.close();
            (this.conn as any) = undefined;
        } catch (e) { this.log.error(e) }
    }

    async isConnected() {
        return this.replicants.status.value.connected === "connected" && Boolean(this.conn);
    }

    // Keep dict of list of promises for pending replies
    responsePromises: { [address: string]: ((response: OscMessage) => any)[] } = {};
    sendToMixer<T extends Arguments, R extends OscMessage<T> = OscMessage<T>>(msg: OscMessage, timeout = 8000) {
        let process: ((m: OscMessage) => any) | null = null;
        let timeoutTimeout: NodeJS.Timeout;

        // Promise that handles relaying the response to the message
        const requestPromise = new Promise<R>((resolve, reject) => {
            process = resolve as (m: OscMessage) => any; // Cast into a more generic type
            // Add to promise list
            if (!this.responsePromises[msg.address]) this.responsePromises[msg.address] = [process];
            else this.responsePromises[msg.address].push(process);
        });

        // Send message to mixer now we are listening
        this.conn.send(msg);

        // Race response against timeout
        return Promise.race([requestPromise, new Promise<R>((resolve, reject) => {
            timeoutTimeout = setTimeout(() => reject(`Response to ${msg.address} timed out`), timeout);
        })]).finally(() => {  // After either finishes, unlisten and remove promise
            clearTimeout(timeoutTimeout);
            if (this.responsePromises[msg.address]) {   // Make sure promise is removed from list
                const index = this.responsePromises[msg.address].indexOf(process!);
                if (index > -1) this.responsePromises[msg.address].splice(index, 1);
            }
        })
    }

    private checkResponsePromises(msg: OscMessage) {
        this.log.info("Recieved message from mixer", JSON.stringify(msg));

        const promises = this.responsePromises[msg.address];
        if (!promises) return;
        this.responsePromises[msg.address] = [];  // Clear list immediately

        promises.forEach(r => r(msg));
    }

    /**
     * Just set a specific fader to the supplied value.
     * @param name Full name of fader (example: /dca/1/fader).
     * @param startValue Value to set (0.0 - 1.0).
     */
    setFader(name: string, value: number): void {
        if (!this.isConnected()) return this.log.error("Fader not set as no connection");

        // Subscribe to specific fader (unecessary probably)
        this.log.debug(`Attempting to set fader on ${name} to ${value}`);
        this.conn.send({
            address: '/subscribe',
            args: [{ type: 's', value: name }, { type: 'i', value: 0 }],
        });
        // Send set command
        this.conn.send({ address: name, args: [{ type: 'f', value }] });
    }

    async incrementFader(addr: string, amount: number) {
        if (!this.conn) return;
        return await this.sendToMixer<[F]>({ "address": addr, args: [] })
            .then(({ args }) => {
                this.conn.send({ "address": addr, "args": [{ type: "f", value: args[0].value + amount }] })
            }).catch(e => this.log.error(`Error incrementing fader ${addr} by ${amount}: ${e}`));
    }

    /**
     * Fades up/down the supplied fader using the specified settings.
     * @param name Full name of fader (example: /dca/1/fader).
     * @param startValue Value to start at (0.0 - 1.0).
     * @param endValue Value to end at (0.0 - 1.0).
     * @param length Milliseconds to spend doing fade.
     */
    async fade(name: string, startValue: number | null, endValue: number, length: number) {
        if (!await this.isConnected()) return this.log.error("Fader not set as no connection");

        // Stop any pre-existing fade on the same fader
        if (this.faderIntervals[name]) {
            clearInterval(this.faderIntervals[name]);
            delete this.faderIntervals[name];
        }

        this.log.debug(`Attempting to fade ${name} (${startValue} => ${endValue}) for ${length}ms`);

        // If provided start value, run fade immediately
        if (startValue) this.runFade(name, startValue, endValue, length);
        else {      // Otherwise fetch current value to start on
            this.log.info(`No start value for ${name}, looking up fader`);
            startValue = await this.sendToMixer<[F]>({ address: name, args: [] })
                .then(r => r.args[0].value)
                .catch(() => { this.log.error("Timeout fetching start value"); return endValue });

            this.log.info(`Looked up value ${startValue} for ${name}, starting fade`);
            this.runFade(name, startValue, endValue, length);
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
        const increase = startValue < endValue;     // Whether increasing or decreasing the fader
        const stepCount = 10 * length / 1000;     // 10 steps per sec (length in ms)
        this.conn.send({ address: '/subscribe', args: [{ type: 's', value: name }, { type: 'i', value: 0 }] });

        // If increasing and over end, if decreasing and under end
        const pastEnd = (val: number) => (increase && val >= endValue) || (!increase && val <= endValue);
        const finishFading = () => {    // Function to trigger at end
            clearInterval(this.faderIntervals[name]);
            delete this.faderIntervals[name];
            this.conn.send({ address: name, args: [{ type: 'f', value: endValue }] });
        }

        let currentValue = startValue;
        let stepIndex = 0;
        let seenOnce = false;
        this.faderIntervals[name] = setInterval(async () => {
            stepIndex++;
            if (stepIndex >= stepCount || pastEnd(currentValue)) {   // Check if done expected step count or has moved past end on schedule
                // if ((increase && currentValue >= endValue - 0.05) || (!increase && currentValue <= endValue + 0.05)) {
                finishFading();
            } else {    // Otherwise, take another step
                currentValue = this.lerp(startValue, endValue, stepIndex / stepCount);
                const response = await this.sendToMixer<[F]>({ address: name, args: [{ type: 'f', value: currentValue }] });

                if (seenOnce && pastEnd(response.args[0].value)) {// If past end value, stop incrementing and set to ending value exactly
                    finishFading();
                } else {    // Make sure there is at least one value recorded before end
                    seenOnce = true;
                }
            }
        }, 100);
    }
}

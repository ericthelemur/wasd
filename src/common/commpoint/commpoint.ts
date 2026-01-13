import NodeCG from '@nodecg/types';

import { ListenersT } from '../messages';
import { BundleReplicant, getNodeCG, sendError, sendSuccess } from '../utils';

type PartialNull<T> = { [P in keyof T]: T[P] | null };

export type Messages<C> = {
    "connect": Partial<C>,
    "connected": undefined,
    "disconnect": undefined
    [name: string]: any
};

export type ConnStatus = "connected" | "connecting" | "disconnected" | "error" | "retrying";
export type ReplicantTypes<S extends { connected: ConnStatus }, L> = {
    status: S,
    login: L
}

// Type forces all replicants to be included
export type Replicants<R> = { [replicant in keyof R]-?: NodeCG.ServerReplicantWithSchemaDefault<R[replicant]> };

export abstract class CommPoint<
    M extends Messages<L>,
    R extends ReplicantTypes<S, L>,
    S extends { connected: ConnStatus; } = R["status"],
    L = R["login"]
> {
    protected namespace: string;
    protected nodecg = getNodeCG();
    public log: NodeCG.Logger;

    public replicants: Replicants<R>;
    protected listeners: ListenersT<M>;

    protected reconnectInterval = 1;
    protected retryPeriod: number = -1;
    protected _reconnectInterval: NodeJS.Timeout | undefined = undefined;

    protected ignoreCloseEvents: boolean = false;

    /**
     * Contruct a comm point. Intended to be used in super calls only
     * @param namespace Namespace name for replicants. Usually the name of the folder
     * @param replicants List of all replicants. Values may be null, these will be created with BundleReplicant
     * @param listeners Listeners for the comm point. Created with createMessageListenersBundle
     */
    constructor(namespace: string, replicants: PartialNull<Replicants<R>>, listeners: ListenersT<M>, checkConnection = false) {
        this.nodecg = getNodeCG();
        this.log = new this.nodecg.Logger(namespace);
        this.namespace = namespace;

        // Build any non-created replicants with default method
        for (const key in replicants) {
            if (replicants[key] === null) {
                replicants[key] = BundleReplicant(key, this.namespace);
            }
        }
        this.replicants = replicants as Replicants<R>;
        this.listeners = listeners;

        this.log.debug(`${namespace} comm point constructed`);

        // Attach basic listeners
        this._connectionListeners(checkConnection);
    }

    // Abstract methods each sub-class needs to implement
    abstract _connect(): Promise<void>;
    abstract _setupListeners(): Promise<void>;
    abstract _disconnect(): Promise<void>;
    abstract isConnected(): Promise<boolean>;

    protected _connectionListeners(checkConnection: boolean = false) {
        this.replicants.status.once("change", newVal => {
            this.log.warn("Startup Check", newVal.connected);
            // this.replicants.status.value.connected = "disconnected";
            // If we were connected last time, try connecting again now.
            if (newVal && ["connected", "connecting", "retrying"].includes(newVal.connected)) {
                this.reconnect(true);
            } else {
                setTimeout(() => this.replicants.status.value.connected = "disconnected");
            }
        });

        this.listeners.listenTo("connect", (p, a) => this._connectHandler(p, a));
        this.listeners.listenTo("disconnect", (p, a) => this._disconnectHandler(p, a));
        if (checkConnection) this._checkConnectionPoll();   // Poll to check is connected periodicly - implemented in most subclasses anyway
    }

    async connect(isRetry: boolean = false) {
        let err: string | null = null;
        if (await this.isConnected()) return "Currently connected. Disconnect before connecting again";
        if (this.ignoreCloseEvents && isRetry) return "Disconnecting in progress...";
        this.ignoreCloseEvents = false;
        await this._connect().then(() => {
            this.stopRetry();
            this.replicants.status.value.connected = "connected";
            this.log.info("Successfully connected");
            this.listeners.sendTo("connected", undefined);
            this._setupListeners().catch((e) => this.log.error("Error creating listeners", e));
            err = null;
        }).catch((e) => {
            if (!isRetry) {
                this.replicants.status.value.connected = "error";
                this.log.error(`Error connecting ${String(e)}`);
            }
            err = "Error connecting " + e;
        });
        return err;
    }

    async disconnect() {
        this.ignoreCloseEvents = true;
        this.stopRetry();

        let err: string | null = null;
        await this._disconnect().then(() => {
            this.replicants.status.value.connected = "disconnected";
            this.log.info("Successfully disconnected");
            err = null;
        }).catch((e) => {
            this.replicants.status.value.connected = "error";
            this.log.error("Error disconnecting", e);
            err = "Error disconnecting " + e;
        });
        return err;
    }


    protected async _connectHandler(params: M["connect"], ack: NodeCG.Acknowledgement | undefined) {
        // Handle nodecg message that instructs to connect

        this.stopRetry();

        this.log.info("Starting connection...");
        this.replicants.status.value.connected = "connecting";

        try {
            this.replicants.login.value = { ...this.replicants.login.value, ...params };
        } catch (e) {
            this.log.error("Error setting login replicant", e);
            sendError(ack, String(e));
            return;
        }

        await this.connect().then((err) => sendError(ack, String(err)));
        sendSuccess(ack, "Connected");
    }

    protected async _disconnectHandler(params: M["disconnect"], ack: NodeCG.Acknowledgement | undefined) {
        // Handle instruction to disconnect

        this.log.info("Starting disconnect...");
        await this.disconnect().then(err => sendError(ack, String(err)));
    }

    private statusAtPreviousCheck: ConnStatus = "disconnected";
    protected _checkConnectionPoll() {
        // Poll for disconnected system regularly
        // Can get cyclic & silly if using status.connected in isConnected()
        setInterval(async () => {
            if (this.statusAtPreviousCheck == "connected") {
                this.statusAtPreviousCheck = this.replicants.status.value.connected;
                const connected = await this.isConnected();
                if (!connected) {
                    this.statusAtPreviousCheck = "disconnected";
                    this.reconnect();
                }
            }
        }, 5 * 1000);
    }

    async reconnect(skipDisconnect = false) { // By default disconnect, pass true to skip disconnecting
        // If unexpectedly disconnected, trigger reconnect process
        if (this._reconnectInterval) return;    // Skip if otherwise reconnecting
        if (this.ignoreCloseEvents) return;     // Skip if ignoring close (if the sub-class has an on close => retry listener)

        if (!skipDisconnect) {
            this.ignoreCloseEvents = true;
            await this._disconnect();   // Run disconnect cleanup (if not startup)
        }
        this.replicants.status.value.connected = "retrying";
        this.retryPeriod = this.reconnectInterval;  // Reset retry period (doubles each attempt)
        this._reconnectInterval = setTimeout(() => this._reconnect(), this.retryPeriod * 1000);
    }

    protected async _reconnect() {
        // Run every reconnect attempt, runs sub-classes' connect(true)
        if (await this.isConnected()) return;
        this.log.warn(`Retrying ${this.namespace} connection`);
        const err = await this.connect(true);
        if (err) {
            this.log.warn(`Retrying connection again in ${this.retryPeriod}s`);
            this.retryPeriod *= 2;      // Exponential back-off for retries - doesn't spam every 10s forever
            this._reconnectInterval = setTimeout(() => this._reconnect(), this.retryPeriod * 1000);
        }
    }

    protected stopRetry() {
        // Cancel retrying
        this.retryPeriod = 0;
        if (this._reconnectInterval) {
            clearInterval(this._reconnectInterval);
            this._reconnectInterval = undefined;
        }
    }

}
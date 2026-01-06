import NodeCG from '@nodecg/types';

import { ListenersT } from '../messages';
import { getNodeCG } from '../utils';

type Dict = { [name: string]: unknown };

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


    constructor(namespace: string, replicants: Replicants<R>, listeners: ListenersT<M>) {
        this.nodecg = getNodeCG();
        this.log = new this.nodecg.Logger(namespace);

        this.namespace = namespace;
        this.replicants = replicants;
        this.listeners = listeners;

        this.log.debug(`${namespace} comm point constructed`);

        this._connectionListeners();
    }

    abstract _connect(): Promise<void>;
    abstract _setupListeners(): Promise<void>;
    abstract _disconnect(): Promise<void>;
    abstract isConnected(): Promise<boolean>;

    protected _connectionListeners() {
        this.replicants.status.once("change", newVal => {
            this.replicants.status.value.connected = "disconnected";
            // If we were connected last time, try connecting again now.
            if (newVal && (newVal.connected === "connected" || newVal.connected === "connecting")) {
                this.reconnect();
            }
        });

        this.listeners.listenTo("connect", (p, a) => this._connectHandler(p, a));
        this.listeners.listenTo("disconnect", (p, a) => this._disconnectHandler(p, a));
        this._checkConnectionPoll();
    }

    protected stopRetry() {
        this.retryPeriod = 0;
        if (this._reconnectInterval) {
            clearInterval(this._reconnectInterval);
            this._reconnectInterval = undefined;
        }
    }


    async connect(isRetry: boolean = false) {
        let err: string | null = null;
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
                this.log.error("Error connecting", e);
            }
            err = "Error connecting " + e;
        });
        return err;
    }

    async disconnect() {
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
        // Handle instruction to connect

        this.stopRetry();

        this.log.info("Starting connection...");
        this.replicants.status.value.connected = "connecting";

        this.replicants.login.value = { ...this.replicants.login.value, ...params };

        await this.connect().then((err) => {
            if (ack && !ack.handled) ack(err);
        })
    }

    protected async _disconnectHandler(params: M["disconnect"], ack: NodeCG.Acknowledgement | undefined) {
        // Handle instruction to disconnect

        this.log.info("Starting disconnect...");
        await this.disconnect().then(err => {
            if (ack && !ack.handled) ack(err);
        })
    }

    protected _checkConnectionPoll() {
        // Poll for disconnected system regularly
        setInterval(async () => {
            if (this.replicants.status.value.connected == "connected") {
                const connected = await this.isConnected();
                if (!connected) {
                    await this._disconnect();
                    this.reconnect();
                }
            }
        }, 5 * 1000);
    }

    async reconnect() {
        // If unexpectedly disconnected, attempt reconnection every reconnectInterval seconds
        if (this._reconnectInterval) return;
        this._disconnect();
        this.replicants.status.value.connected = "retrying";
        this.retryPeriod = this.reconnectInterval;
        this._reconnectInterval = setTimeout(() => this._reconnect(), this.retryPeriod * 1000);
    }

    protected async _reconnect() {
        this.log.warn(`Retrying ${this.namespace} connection`);
        const err = await this.connect(true);
        if (err) {
            this.log.warn(`Retrying connection again in ${this.retryPeriod}s`);
            this.retryPeriod *= 2;
            this._reconnectInterval = setTimeout(() => this._reconnect(), this.retryPeriod * 1000);
        }
    }
}
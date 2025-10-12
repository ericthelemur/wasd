import NodeCG from '@nodecg/types';

import { ListenersT } from '../messages';
import { getNodeCG, Replicant, sendError, sendSuccess } from '../utils';

type Dict = { [name: string]: unknown };

export type Messages<C> = {
    "connect": Partial<C>,
    "disconnect": undefined
    [name: string]: any
};

export type ConnStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
export type Replicants<S extends { connected: ConnStatus }, L> = {
    status: NodeCG.ServerReplicantWithSchemaDefault<S>,
    login: NodeCG.ServerReplicantWithSchemaDefault<L>
}

export abstract class CommPoint<
    M extends Messages<L>, S extends { connected: ConnStatus; }, L,
    R extends Replicants<S, L>
> {
    protected namespace: string;
    protected reconnectInterval = 10;
    protected nodecg = getNodeCG();
    public log: NodeCG.Logger;

    public replicants: R;
    protected listeners: ListenersT<M>;

    protected _reconnectInterval: NodeJS.Timeout | undefined = undefined;


    constructor(namespace: string, replicants: R, listeners: ListenersT<M>) {
        this.nodecg = getNodeCG();
        this.log = new this.nodecg.Logger(namespace);

        this.namespace = namespace;
        this.replicants = replicants;
        this.listeners = listeners;

        this.log.info(`${namespace} comm point built`);

        this._connectionListeners();
    }

    abstract _connect(): Promise<void>;
    abstract _setupListeners(): Promise<void>;
    abstract _disconnect(): Promise<void>;
    abstract isConnected(): Promise<boolean>;

    protected _connectionListeners() {
        this.replicants.status.once('change', newVal => {
            // If we were connected last time, try connecting again now.
            if (newVal && (newVal.connected === 'connected' || newVal.connected === 'connecting')) {
                this.listeners.sendTo("connect", {});
            }
        });

        this.listeners.listenTo("connect", (p, a) => this._connectHandler(p, a));
        this.listeners.listenTo("disconnect", (p, a) => this._disconnectHandler(p, a));
        this._checkConnectionPoll();
    }

    protected async _connectInternal() {
        let err: string | null = null;
        await this._connect().then(() => {
            this.replicants.status.value.connected = "connected";
            this.log.info("Successfully connected");
            this._setupListeners().catch((e) => this.log.error("Error creating listeners", e));
            err = null;
        }).catch((e) => {
            this.replicants.status.value.connected = "error";
            this.log.error("Error connecting", e);
            err = "Error connecting " + e;
        });
        return err;
    }

    protected async _connectHandler(params: M["connect"], ack: NodeCG.Acknowledgement | undefined) {
        // Handle instruction to connect

        if (this._reconnectInterval) {
            clearInterval(this._reconnectInterval);
            this._reconnectInterval = undefined;
        }

        this.log.info("Starting connection...");
        this.replicants.status.value.connected = "connecting";

        this.replicants.login.value = { ...this.replicants.login.value, ...params };

        await this._connectInternal().then((err) => {
            if (ack && !ack.handled) ack(err);
        })
    }

    protected async _disconnectHandler(params: M["disconnect"], ack: NodeCG.Acknowledgement | undefined) {
        // Handle instruction to disconnect

        this.log.info("Starting disconnect...");
        if (this._reconnectInterval) {
            clearInterval(this._reconnectInterval);
            this._reconnectInterval = undefined;
        }

        this._disconnect().then(() => {
            this.replicants.status.value.connected = "disconnected";
            this.log.info("Successful requested disconnected");
        }).catch((e) => {
            this.replicants.status.value.connected = "error";
            this.log.error("Error disconnecting", e);
            sendError(ack, "Error disconnecting " + e);
        });
    }

    protected _checkConnectionPoll() {
        // Poll for disconnected system regularly
        setInterval(async () => {
            if (this.replicants.status.value.connected == "connected") {
                const connected = await this.isConnected();
                if (!connected) {
                    this._reconnect();
                }
            }
        }, 10 * 1000);
    }

    private _reconnect() {
        // If unexpectedly disconnected, attempt reconnection every reconnectInterval seconds
        if (this._reconnectInterval) return;

        this.replicants.status.value.connected = "connecting";
        this.log.warn(`Attempting reconnection every ${this.reconnectInterval}s.`);
        this._reconnectInterval = setInterval(this._connectInternal, this.reconnectInterval * 1000);
    }
}
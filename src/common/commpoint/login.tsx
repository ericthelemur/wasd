import '../../common/uwcs-bootstrap.css';

import { FormEvent } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useReplicant } from 'use-nodecg';

import NodeCG from '@nodecg/types';

import { ListenersT } from '../../common/messages';
import { Configschema } from '../../types/schemas';
import { ConnStatus, Messages, ReplicantTypes } from './commpoint';

declare const nodecg: NodeCG.ClientAPI<Configschema>;

export function CreateCommPointConnect<
    M extends Messages<L>,
    R extends ReplicantTypes<S, L>,
    S extends { connected: ConnStatus; } = R["status"],
    L = R["login"]
>(
    namespace: string,
    paramElements: React.ReactNode | null,
    getParams: () => M["connect"],
    defaultStatus: S,
    listeners: ListenersT<M>) {

    function Status({ status }: { status?: ConnStatus }) {
        switch (status) {
            case "connected": return <Badge bg="success">Connected</Badge>
            case "connecting": return <Badge bg="info">Connecting</Badge>
            case "retrying": return <Badge bg="info">Retrying</Badge>
            case "disconnected": return <Badge bg="danger">Disconnected</Badge>
            case "error": return <Badge bg="danger">Error</Badge>
        }
        return null;
    }

    function ConnectForm() {
        // const [login,] = useReplicant<L>("login", defaultValue, { namespace: namespace });

        function connect(e: FormEvent) {
            e.preventDefault();
            const params = getParams();
            nodecg.log.info('Attempting to connect to', namespace, "with", JSON.stringify(params));
            listeners.sendTo("connect", params);
        }

        return (
            <Form onSubmit={connect} className="vstack gap-3">
                {paramElements}
                <Button type="submit">Connect</Button>
            </Form>
        )
    }


    function DisconnectForm({ status }: { status: ConnStatus }) {
        function disconnect(e: FormEvent) {
            e.preventDefault();
            if (status != "connected" || confirm(`Are you sure you want to disconnect from ${namespace}?`)) {
                nodecg.log.info('Attempting to disconnect');
                listeners.sendTo("disconnect");
            }
        }

        return (
            <Form onSubmit={disconnect} className="vstack gap-3 mt-2">
                <Button variant="outline-danger" type="submit">Disconnect</Button>
            </Form>
        )
    }


    function ControlForms() {
        const [status,] = useReplicant<S>("status", defaultStatus, { "namespace": namespace });

        const notConnecting = !status || status.connected === "disconnected" || status.connected === "error" || status.connected === "retrying";
        return <div className="m-3">
            <div className="mb-3">
                Status: <Status status={status?.connected} />
            </div>
            {notConnecting ? <ConnectForm /> : <DisconnectForm status={status.connected} />}
        </div>
    }

    return ControlForms;
}


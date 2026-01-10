import '../../common/uwcs-bootstrap.css';

import { FormEvent, useRef } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useReplicant } from 'use-nodecg';

import NodeCG from '@nodecg/types';

import { ListenersT } from '../../common/messages';
import { Configschema } from '../../types/schemas';
import { ConnStatus, Messages, ReplicantTypes } from './commpoint';
import { FloatingLabel } from 'react-bootstrap';

declare const nodecg: NodeCG.ClientAPI<Configschema>;

export function Status({ status }: { status?: ConnStatus }) {
    switch (status) {
        case "connected": return <Badge bg="success">Connected</Badge>
        case "connecting": return <Badge bg="info">Connecting</Badge>
        case "retrying": return <Badge bg="info">Retrying</Badge>
        case "disconnected": return <Badge bg="danger">Disconnected</Badge>
        case "error": return <Badge bg="danger">Error</Badge>
    }
    return null;
}

export function CreateCommPointConnect<
    M extends Messages<L>,
    R extends ReplicantTypes<S, L>,
    S extends { connected: ConnStatus; } = R["status"],
    L = R["login"]
>(namespace: string, listeners: ListenersT<M>, fields: { [key in keyof L]: string }, defaultLogin: L, defaultStatus: S, ExtraStatus?: (props: { status: S }) => React.JSX.Element) {

    function ConnectForm() {
        const [login,] = useReplicant<L>("login", defaultLogin, { namespace: namespace });
        console.log(login);
        const refs = useRef<{ [key: string]: HTMLInputElement }>({});

        function connect(e: FormEvent) {
            e.preventDefault();

            let login: { [key: string]: string } = {};
            for (let key of Object.keys(fields)) {
                login[key] = String(refs.current[key].value);
            }
            listeners.sendTo("connect", login as L);
        }

        return <Form onSubmit={connect} className="vstack gap-3">
            {Object.keys(fields).map((key) => {
                const field = key as keyof L & string;
                return <FormInput key={field} field={field} label={fields[field]} defaultValue={login ? String(login[field] || "") : ""} refs={refs} />;
            })}
            <Button type="submit">Connect</Button>
        </Form>
    }

    function FormInput(props: { field: string, label: string, defaultValue: string, refs: React.MutableRefObject<{ [key: string]: HTMLInputElement }> }) {
        return <FloatingLabel className="flex-grow-1" controlId={props.field} label={props.label}>
            <Form.Control ref={e => props.refs.current[props.field] = e!} defaultValue={props.defaultValue} />
        </FloatingLabel>
    }


    function DisconnectForm({ status }: { status: ConnStatus }) {
        function disconnect(e: FormEvent) {
            e.preventDefault();
            if (status != "connected" || confirm(`Are you sure you want to disconnect from ${namespace}?`)) {
                nodecg.log.info('Attempting to disconnect');
                listeners.sendTo("disconnect", undefined);
            }
        }

        return (
            <Form onSubmit={disconnect} className="vstack gap-3 mt-2">
                <Button variant="outline-danger" type="submit">{status == "connected" ? "Disconnect" : "Cancel"}</Button>
            </Form>
        )
    }


    function ControlForms() {
        const [status,] = useReplicant<S>("status", defaultStatus, { "namespace": namespace });

        const notConnecting = !status || status.connected === "disconnected" || status.connected === "error";
        return <div className="m-3">
            <div className="mb-3">
                Status: <Status status={status?.connected} />
                {status && ExtraStatus && <ExtraStatus status={status} />}
            </div>
            {notConnecting ? <ConnectForm /> : <DisconnectForm status={status.connected} />}
        </div>
    }

    return ControlForms;
}

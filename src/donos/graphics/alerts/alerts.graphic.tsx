import '../../../common/uwcs-bootstrap.css';
import 'react-toastify/dist/ReactToastify.css';
import './alerts.graphic.css';

import { createRoot } from 'react-dom/client';
import { toast, ToastContainer } from 'react-toastify';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

import { Notification } from './notification';
import { listenTo, sendTo } from '../../../tiltify/messages';
import { Donation } from 'types/schemas/tiltify';

declare var nodecg: NodeCGAPIClient;

listenTo("show-dono", (dono) => {
    toast(<Notification dono={dono as Donation} />, {
        toastId: dono.id,
        position: "bottom-left",
        autoClose: 10000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
        progress: undefined,
        theme: "light",
    })
    sendTo("set-donation-shown", [dono, true]);
})
listenTo("revoke-dono", (dono) => {
    toast.dismiss(dono.id);
})

const root = createRoot(document.getElementById('root')!);
root.render(<ToastContainer limit={5} closeButton={false} newestOnTop={true} />);
import 'wasd-common/shared/uwcs-bootstrap.css';
import 'react-toastify/dist/ReactToastify.css';
import './alerts.graphic.css';

import { createRoot } from 'react-dom/client';
import { toast, ToastContainer } from 'react-toastify';

import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';

import { Notification } from './notification';

declare var nodecg: NodeCGAPIClient;

nodecg.listenFor("show-dono", "nodecg-tiltify", (dono) => {
    toast(<Notification dono={dono} />, {
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
    nodecg.sendMessageToBundle("set-donation-shown", "nodecg-tiltify", [dono, true]);
})

nodecg.listenFor("revoke-dono", "nodecg-tiltify", (dono) => {
    toast.dismiss(dono.id);
})

const root = createRoot(document.getElementById('root')!);
root.render(<ToastContainer limit={5} closeButton={false} newestOnTop={true} />);
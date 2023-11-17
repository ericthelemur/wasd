import 'bootstrap-icons/font/bootstrap-icons.min.css';

import { APPROVED, CENSORED, ModStatus, UNDECIDED } from 'nodecg-tiltify/src/extension/utils/mod';

export interface ModAction {
    icon: React.JSX.Element;
    iconAction: React.JSX.Element;
    action: string;
    value: ModStatus;
}


export const read: ModAction = {
    icon: <i className="bi bi-envelope-fill-open"></i>,
    iconAction: <i className="bi bi-envelope-open"></i>,
    action: "Read",
    value: true
}

export const unread: ModAction = {
    icon: <i className="bi bi-envelope-fill"></i>,
    iconAction: <i className="bi bi-envelope"></i>,
    action: "Unread",
    value: false
}


export const shown: ModAction = {
    icon: <i className="bi bi-eye-fill"></i>,
    iconAction: <i className="bi bi-eye"></i>,
    action: "Show",
    value: true
}

export const unshown: ModAction = {
    icon: <i className="bi bi-eye-slash-fill"></i>,
    iconAction: <i className="bi bi-eye-slash"></i>,
    action: "Unshow",
    value: false
}


export const approved: ModAction = {
    icon: <i className="bi bi-check2-square"></i>,
    iconAction: <i className="bi bi-check-lg"></i>,
    action: "Approve",
    value: APPROVED
}

export const undecided: ModAction = {
    icon: <i className="bi bi-question-square"></i>,
    iconAction: <i className="bi bi-arrow-counterclockwise"></i>,
    action: "Reset",
    value: UNDECIDED
}

export const censored: ModAction = {
    icon: <i className="bi bi-x-square"></i>,
    iconAction: <i className="bi bi-ban"></i>,
    action: "Censor",
    value: CENSORED
}
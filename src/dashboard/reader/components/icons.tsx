import 'bootstrap-icons/font/bootstrap-icons.min.css';

import { APPROVED, CENSORED, ModStatus, UNDECIDED } from 'nodecg-tiltify/src/extension/utils/mod';

export interface ModAction {
    icon: React.JSX.Element;
    iconAction: React.JSX.Element;
    action: string;
    category: string,
    value: ModStatus;
}


export const read: ModAction = {
    icon: <i className="bi bi-envelope-open-fill"></i>,
    iconAction: <i className="bi bi-envelope-open-fill"></i>,
    action: "Read",
    category: "read",
    value: true
}

export const unread: ModAction = {
    icon: <i className="bi bi-envelope-fill"></i>,
    iconAction: <i className="bi bi-envelope-fill"></i>,
    action: "Unread",
    category: "unread",
    value: false
}


export const shown: ModAction = {
    icon: <i className="bi bi-eye-fill"></i>,
    iconAction: <i className="bi bi-eye-fill"></i>,
    action: "Show",
    category: "shown",
    value: true
}

export const unshown: ModAction = {
    icon: <i className="bi bi-eye-slash-fill"></i>,
    iconAction: <i className="bi bi-eye-slash-fill"></i>,
    action: "Unshow",
    category: "unshown",
    value: false
}


export const approved: ModAction = {
    icon: <i className="bi bi-check-lg"></i>,
    iconAction: <i className="bi bi-check-lg"></i>,
    action: "Approve",
    category: "approved",
    value: APPROVED
}

export const undecided: ModAction = {
    icon: <i className="bi bi-question-lg"></i>,
    iconAction: <i className="bi bi-arrow-counterclockwise"></i>,
    action: "Reset",
    category: "undecided",
    value: UNDECIDED
}

export const censored: ModAction = {
    icon: <i className="bi bi-ban"></i>,
    iconAction: <i className="bi bi-ban"></i>,
    action: "Censor",
    category: "censored",
    value: CENSORED
}

export const asc: ModAction = {
    icon: <i className="bi bi-arrow-up"></i>,
    iconAction: <i className="bi bi-arrow-up"></i>,
    action: "Sort Ascending",
    category: "asc",
    value: null
}

export const dsc: ModAction = {
    icon: <i className="bi bi-arrow-down"></i>,
    iconAction: <i className="bi bi-arrow-down"></i>,
    action: "Sort Descending",
    category: "dsc",
    value: null
}

export const time: ModAction = {
    icon: <i className="bi bi-clock"></i>,
    iconAction: <i className="bi bi-clock"></i>,
    action: "Sort by time",
    category: "time",
    value: null
}

export const money: ModAction = {
    icon: <i className="bi bi-currency-pound"></i>,
    iconAction: <i className="bi bi-currency-pound"></i>,
    action: "Sort by money",
    category: "money",
    value: null
}

export const live: ModAction = {
    icon: <i className="bi bi-bell-fill"></i>,
    iconAction: <i className="bi bi-bell-fill"></i>,
    action: "Live",
    category: "live",
    value: null
}

export const all: ModAction = {
    icon: <i className="bi bi-archive-fill"></i>,
    iconAction: <i className="bi bi-archive-fill"></i>,
    action: "All",
    category: "all",
    value: null
}

export const donors: ModAction = {
    icon: <i className="bi bi-people-fill"></i>,
    iconAction: <i className="bi bi-people-fill"></i>,
    action: "Donors",
    category: "donors",
    value: null
}

export const incentives: ModAction = {
    icon: <i className="bi bi-piggy-bank-fill"></i>,
    iconAction: <i className="bi bi-piggy-bank-fill"></i>,
    action: "Incentives",
    category: "incentives",
    value: null
}
// import 'bootstrap-icons/font/bootstrap-icons.min.css';
import { EnvelopeOpenFill, EnvelopeFill, EyeFill, EyeSlashFill, CheckLg, QuestionLg, ArrowCounterclockwise, Ban, ArrowUp, ArrowDown, Clock, CurrencyPound, BellFill, ArchiveFill, PeopleFill, PiggyBankFill } from 'react-bootstrap-icons';

import { APPROVED, CENSORED, ModStatus, UNDECIDED } from 'tiltify/extension/utils/mod';

export interface ModAction {
    icon: React.JSX.Element;
    iconAction: React.JSX.Element;
    action: string;
    category: string,
    value: ModStatus;
}


export const read: ModAction = {
    icon: <EnvelopeOpenFill />,
    iconAction: <EnvelopeOpenFill />,
    action: "Read",
    category: "read",
    value: true
}

export const unread: ModAction = {
    icon: <EnvelopeFill />,
    iconAction: <EnvelopeFill />,
    action: "Unread",
    category: "unread",
    value: false
}


export const shown: ModAction = {
    icon: <EyeFill />,
    iconAction: <EyeFill />,
    action: "Show",
    category: "shown",
    value: true
}

export const unshown: ModAction = {
    icon: <EyeSlashFill />,
    iconAction: <EyeSlashFill />,
    action: "Unshow",
    category: "unshown",
    value: false
}


export const approved: ModAction = {
    icon: <CheckLg />,
    iconAction: <CheckLg />,
    action: "Approve",
    category: "approved",
    value: APPROVED
}

export const undecided: ModAction = {
    icon: <QuestionLg />,
    iconAction: <ArrowCounterclockwise />,
    action: "Reset",
    category: "undecided",
    value: UNDECIDED
}

export const censored: ModAction = {
    icon: <Ban />,
    iconAction: <Ban />,
    action: "Censor",
    category: "censored",
    value: CENSORED
}

export const asc: ModAction = {
    icon: <ArrowUp />,
    iconAction: <ArrowUp />,
    action: "Sort Ascending",
    category: "asc",
    value: null
}

export const dsc: ModAction = {
    icon: <ArrowDown />,
    iconAction: <ArrowDown />,
    action: "Sort Descending",
    category: "dsc",
    value: null
}

export const time: ModAction = {
    icon: <Clock />,
    iconAction: <Clock />,
    action: "Sort by time",
    category: "time",
    value: null
}

export const money: ModAction = {
    icon: <CurrencyPound />,
    iconAction: <CurrencyPound />,
    action: "Sort by money",
    category: "money",
    value: null
}

export const live: ModAction = {
    icon: <BellFill />,
    iconAction: <BellFill />,
    action: "Live",
    category: "live",
    value: null
}

export const all: ModAction = {
    icon: <ArchiveFill />,
    iconAction: <ArchiveFill />,
    action: "All",
    category: "all",
    value: null
}

export const donors: ModAction = {
    icon: <PeopleFill />,
    iconAction: <PeopleFill />,
    action: "Donors",
    category: "donors",
    value: null
}

export const incentives: ModAction = {
    icon: <PiggyBankFill />,
    iconAction: <PiggyBankFill />,
    action: "Incentives",
    category: "incentives",
    value: null
}
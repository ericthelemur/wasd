import { APPROVED, CENSORED, ModStatus, UNDECIDED } from 'nodecg-tiltify/src/extension/utils/mod';
import {
    CheckAll, EnvelopeFill, EnvelopeOpenFill, EyeFill, EyeSlashFill, QuestionLg, XLg
} from 'react-bootstrap-icons';

export interface ModAction {
    icon: React.JSX.Element;
    action: string;
    value: ModStatus;
}


export const read: ModAction = {
    icon: <EnvelopeOpenFill />,
    action: "Read",
    value: true
}

export const unread: ModAction = {
    icon: <EnvelopeFill />,
    action: "Unread",
    value: false
}


export const shown: ModAction = {
    icon: <EyeFill />,
    action: "Show",
    value: true
}

export const unshown: ModAction = {
    icon: <EyeSlashFill />,
    action: "Unshow",
    value: false
}


export const approved: ModAction = {
    icon: <CheckAll />,
    action: "Approve",
    value: APPROVED
}

export const undecided: ModAction = {
    icon: <QuestionLg />,
    action: "Reset",
    value: UNDECIDED
}

export const censored: ModAction = {
    icon: <XLg />,
    action: "Censor",
    value: CENSORED
}
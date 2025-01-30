import { tripleState } from 'tiltify/extension/utils/mod';
import Card from 'react-bootstrap/Card';

import { dateFormat, DonoProp, formatAmounts, timeFormat } from '../utils';
import { Buttons } from './buttons';
import { Incentives } from './dono_incentives';
import { approved, censored, read, shown, undecided, unread, unshown } from './icons';

function DonationTitle({ dono }: DonoProp) {
    return (
        <h2 className="h5 card-title">
            <span className="name">{dono.donor_name}</span>{" "}
            <span className="donated">donated</span>{" "}
            <span className="amount">{formatAmounts(dono.amount, dono.displayAmount)}</span>
        </h2>
    )
}


function DonationSubtitle({ dono }: DonoProp) {
    const date = new Date(dono.completed_at);
    var statuses = <></>;
    if (dono.read !== undefined) {
        statuses = <span className="statuses">
            {dono.read ? read.icon : unread.icon}{" "}
            {dono.shown ? shown.icon : unshown.icon}{" "}
            {tripleState(dono.modStatus, approved.icon, undecided.icon, censored.icon)}{" "}
        </span>
    }

    return (
        <small className='datetime card-subtitle text-body-tertiary'>
            <span className="time">{timeFormat.format(date)}</span>{" "}
            <span className="date">{dateFormat.format(date)}</span>{" "}
            {statuses}
        </small>
    )
}


export function Donation({ dono }: DonoProp) {
    var classes: string[] = [];
    if (dono.read !== undefined)
        classes = [dono.read ? 'read' : 'unread', dono.shown ? 'shown' : 'unshown', tripleState(dono.modStatus, 'approved', 'undecided', 'censored')];
    return (
        <Card className={classes.join(" ")}>
            <Card.Body>
                <DonationTitle dono={dono} />
                <DonationSubtitle dono={dono} />
                <p className="message card-text">{dono.donor_comment || "No Message"}</p>
                <Incentives {...dono} />
                <Buttons dono={dono} />
            </Card.Body>
        </Card>
    );
}
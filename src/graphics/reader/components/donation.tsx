import { tripleState } from 'nodecg-tiltify/src/extension/utils/mod';
import { Donation } from 'nodecg-tiltify/src/types/schemas/donations';
import { Donor } from 'nodecg-tiltify/src/types/schemas/donors';
import Card from 'react-bootstrap/Card';

import { DonoProp, dateFormat, getAmount, timeFormat } from '../utils';
import { Buttons } from './buttons';
import { approved, censored, read, shown, undecided, unread, unshown } from './icons';

function DonationTitle({ dono }: DonoProp) {
    const amounts = getAmount(dono.amount.currency, dono.amount.value, dono.amountDisplay);
    return (
        <h2 className="h5 card-title">
            <span className="name">{dono.donor_name}</span>{" "}
            <span className="donated">donated</span>{" "}
            <span className="amount">{amounts[0]}</span>{" "}
            {amounts[1] ? <span className="amount amount-gdp">({amounts[1]})</span> : ""}
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
                <Buttons dono={dono} />
            </Card.Body>
        </Card>
    );
}

export interface DonorProps {
    donor: Donor,
    donos: Donation[]
}
import { Donation } from 'types/schemas/tiltify';

import { formatAmount } from '../../dashboard/reader/utils';

export function Notification({ dono }: { dono: Donation }) {
    return (
        <>
            <h6>
                <b><i className="bi bi-star-fill"></i> {dono.donor_name}</b>
                {" donated "}
                <b>{formatAmount(dono.amount)}</b>
            </h6>
            <div className="msg">{dono.donor_comment}</div>
        </>
    )
}
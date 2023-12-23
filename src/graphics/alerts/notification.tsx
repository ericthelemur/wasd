import { Donation } from 'nodecg-tiltify/src/types/schemas/donations';

import { formatAmounts } from '../../dashboard/reader/utils';

export function Notification({ dono }: { dono: Donation }) {
    return (
        <>
            <h6>
                <b><i className="bi bi-star-fill"></i> {dono.donor_name}</b>
                {" donated "}
                <b>{formatAmounts(dono.amount, dono.displayAmount)}</b>
            </h6>
            <div className="msg">{dono.donor_comment}</div>
        </>
    )
}
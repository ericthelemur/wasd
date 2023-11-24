import { Milestones, Polls, Reward, Rewards, Targets } from "nodecg-tiltify/src/types/schemas";
import { useReplicant } from "use-nodecg";
import { dateFormat, formatAmount, timeFormat } from "../utils";
import Card from 'react-bootstrap/Card';


function Reward({ reward }: { reward: Reward }) {
    var start = reward.starts_at ? new Date(reward.starts_at) : null;
    var end = reward.ends_at ? new Date(reward.ends_at) : null;
    return (
        <Card>
            <Card.Body>
                <details className="reward text-body-tertiary">
                    <summary>
                        <i className="bi bi-star-fill"></i>{" "}
                        {reward.name} for {formatAmount(reward.amount)}<br />
                        Raised {reward.amount_raised ? formatAmount(reward.amount_raised) : "£0"}{" • "}
                        {reward.quantity_remaining && reward.quantity ? `${reward.quantity_remaining}/${reward.quantity} remaining` : ""}{" • "}
                        {start ? ("Starts " + timeFormat.format(start) + " " + dateFormat.format(start) + " • ") : ""}
                        {end ? ("Ends " + timeFormat.format(end) + " " + dateFormat.format(end) + " • ") : ""}
                    </summary>
                    {reward.description}
                </details>
            </Card.Body>
        </Card>
    )
}


export function Incentives() {
    const [rewards, _] = useReplicant<Rewards>("rewards", [], { namespace: "nodecg-tiltify" });
    const [targets, _2] = useReplicant<Targets>("targets", [], { namespace: "nodecg-tiltify" });
    const [polls, _3] = useReplicant<Polls>("polls", [], { namespace: "nodecg-tiltify" });
    const [milestones, _4] = useReplicant<Milestones>("milestones", [], { namespace: "nodecg-tiltify" });

    return (
        <div className="donations">
            {rewards?.map(r => <Reward reward={r} />)}
        </div>
    )
}
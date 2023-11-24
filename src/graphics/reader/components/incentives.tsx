import { Milestones, Polls, Reward, Rewards, Target, Targets } from "nodecg-tiltify/src/types/schemas";
import { useReplicant } from "use-nodecg";
import { dateFormat, formatAmount, timeFormat } from "../utils";
import Card from 'react-bootstrap/Card';

function start_date(date: string | null) {
    if (!date) return "";
    const start = new Date(date);
    const now = new Date(Date.now());
    if (now > start) return "";
    return "Starts " + timeFormat.format(start) + " " + dateFormat.format(start);
}

function end_date(date: string | null) {
    if (!date) return "";
    const end = new Date(date);
    const now = new Date(Date.now());
    const nextday = now.getTime() + (24 * 60 * 60 * 1000);
    if (nextday < end.getTime()) return "";
    return (now < end ? "Ends " : "Ended ") + timeFormat.format(end) + " " + dateFormat.format(end);
}

function dates(start: string | null, end: string | null) {
    const start_txt = start_date(start);
    if (start_txt) return start_txt;
    const end_txt = end_date(end);
    return end_txt;

}

function RewardCard({ reward }: { reward: Reward }) {
    var date_txt = dates(reward.starts_at || null, reward.ends_at || null);
    return (
        <Card>
            <Card.Body>
                <details className="reward text-body-tertiary">
                    <summary>
                        <i className="bi bi-star-fill"></i>{" "}
                        {reward.name} for {formatAmount(reward.amount)}<br />
                        Raised {reward.amount_raised ? formatAmount(reward.amount_raised) : "£0"}
                        {reward.quantity_remaining && reward.quantity ? ` • ${reward.quantity_remaining}/${reward.quantity} remaining` : ""}
                        {date_txt ? (" • " + date_txt) : ""}
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
        <>
            <h2>Rewards</h2>
            <div className="donations">
                {rewards?.map(r => <RewardCard reward={r} />)}
            </div>
        </>
    )
}
import { Milestone, Milestones, Polls, Reward, Rewards, Target, Targets, Total } from "nodecg-tiltify/src/types/schemas";
import { useReplicant } from "use-nodecg";
import { dateFormat, formatAmount, timeFormat } from "../utils";
import Card from 'react-bootstrap/Card';
import { ProgressBar } from "./progress";

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
        <Card key={reward.id}>
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

function TargetCard({ target }: { target: Target }) {
    var date_txt = dates(null, target.ends_at || null);
    const label = `${formatAmount(target.amount_raised)} / ${formatAmount(target.amount)}`;
    return (
        <Card key={target.id}>
            <Card.Body>
                <div className="target">
                    <i className="bi bi-bullseye"></i>{" "}
                    {target.name} {label}<br />
                    <ProgressBar label={label} value={Number(target.amount_raised)} maxVal={Number(target.amount)} />
                </div>
            </Card.Body>
        </Card>
    )
}

function MilestoneCard({ milestone, total }: { milestone: Milestone, total: Total }) {
    const label = `${formatAmount(total)} / ${formatAmount(milestone.amount)}`;
    return (
        <Card key={milestone.id}>
            <Card.Body>
                <div className="milestone">
                    <i className="bi bi-bullseye"></i>{" "}
                    {milestone.name} {label}<br />
                    <ProgressBar label={label} value={Number(total.value)} maxVal={Number(milestone.amount.value)} />
                </div>
            </Card.Body>
        </Card>
    )
}

export function Incentives() {
    const [rewards, _] = useReplicant<Rewards>("rewards", [], { namespace: "nodecg-tiltify" });
    const [targets, _2] = useReplicant<Targets>("targets", [], { namespace: "nodecg-tiltify" });
    const [polls, _3] = useReplicant<Polls>("polls", [], { namespace: "nodecg-tiltify" });
    const [milestones, _4] = useReplicant<Milestones>("milestones", [], { namespace: "nodecg-tiltify" });
    const [total, _5] = useReplicant<Total>("total", { "currency": "GBP", "value": 0 }, { namespace: "nodecg-tiltify" });

    return (
        <>
            <h2>Rewards</h2>
            <div className="donations">
                {rewards?.map(r => <RewardCard reward={r} />)}
            </div>
            <h2 className="mt-3">Targets</h2>
            <div className="donations">
                {targets?.map(t => <TargetCard target={t} />)}
            </div>
            <h2 className="mt-3">Milestones</h2>
            <div className="donations">
                {milestones?.map(m => <MilestoneCard milestone={m} total={total!} />)}
            </div>
        </>
    )
}
import {
    Amount, Milestone, Milestones, Poll, Polls, Reward, Rewards, Target, Targets, Total
} from 'nodecg-tiltify/src/types/schemas';
import { useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { useReplicant } from 'use-nodecg';

import { dateFormat, formatAmount, sortMapSingle, timeFormat } from '../utils';
import { ProgressBar } from './progress';

const hitBadge = <Badge bg="success-subtle" className="small text-success"> Hit</Badge>;

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
        <Card className={(reward.quantity_remaining == 0 || (reward.ends_at && new Date(reward.ends_at).getTime() < Date.now())) ? "read" : ""}>
            <Card.Body>
                <details className="reward">
                    <summary>
                        <i className="bi bi-star-fill"></i>{" "}
                        {reward.name} for {formatAmount(reward.amount)}
                        {date_txt ? (<span className="text-body-tertiary">date_txt</span>) : ""}
                    </summary>
                    {reward.quantity_remaining && reward.quantity ? `${reward.quantity_remaining}/${reward.quantity} remaining` : ""}<br />
                    {reward.description}
                </details>
            </Card.Body>
        </Card>
    )
}


function TargetCards({ targets }: { targets: Target[] }) {
    const [showAll, setShowAll] = useState(false);
    const showOption = targets.length >= 3;
    const ti = targets.length >= 3 ? targets.slice(0, 3) : targets;
    const content = sortMapSingle(showAll ? targets : ti, t => Number(t.amount_raised.value), t => <TargetCard key={t.id} target={t} />, true);
    const btn = <Button className="px-1 py-0" variant="outline-secondary" onClick={() => setShowAll(!showAll)}><span className="small">Show {showAll ? "Less" : "All"}</span></Button>;

    return <>
        <h2 className="mt-3">Targets {showOption ? btn : ""}</h2>
        <div className="donations">
            {content}
        </div>
    </>
}

function TargetCard({ target }: { target: Target }) {
    var date_txt = dates(null, target.ends_at || null);
    const label = `${formatAmount(target.amount_raised)} / ${formatAmount(target.amount)}`;
    const hit = Number(target.amount_raised.value) >= Number(target.amount.value);

    return (
        <Card key={target.id} className={hit ? "text-success" : ""}>
            <Card.Body>
                <div className="target">
                    <h3 className="h5">
                        <i className="bi bi-bullseye"></i>{" "}
                        {target.name} <span className="text-body-tertiary">{date_txt}</span>
                        {hit ? hitBadge : ""}
                    </h3>
                    <ProgressBar label={label} value={Number(target.amount_raised.value)} maxVal={Number(target.amount.value)}
                        colour2={hit ? "var(--bs-success-bg-subtle)" : "var( --bs-secondary-bg)"} />
                </div>
            </Card.Body>
        </Card>
    )
}


function findMilestones(ms: Milestone[] | undefined, total: Amount) {
    // Pick an index so it shows the last hit milestone and next two
    const milestones = ms ? [...ms] : [];
    if (milestones.length <= 3) return milestones;
    const threshold = Number(total.value);
    milestones.sort((a, b) => Number(a.amount.value) - Number(b.amount.value));
    const justHit = milestones.findIndex(m => Number(m.amount.value) > threshold);
    if (justHit === -1) return milestones.slice(milestones.length - 3, milestones.length);
    const i = Math.min(milestones.length - 3, Math.max(0, justHit - 1));
    return milestones.slice(i, i + 3);
}

function MilestoneCards({ milestones, total }: { milestones: Milestone[], total: Total }) {
    const [showAll, setShowAll] = useState(false);
    const showOption = milestones.length >= 3;
    const mi = findMilestones(milestones, total);
    const content = (showAll ? milestones : mi).map(m => <MilestoneCard key={m.id} milestone={m} total={total} />);
    const btn = <Button className="px-1 py-0" variant="outline-secondary" onClick={() => setShowAll(!showAll)}><span className="small">Show {showAll ? "Less" : "All"}</span></Button>;

    return <>
        <h2 className="mt-3">Milestones {showOption ? btn : ""}</h2>
        <div className="donations">
            {content}
        </div>
    </>

}


function MilestoneCard({ milestone, total }: { milestone: Milestone, total: Total }) {
    const label = `${formatAmount(total)} / ${formatAmount(milestone.amount)}`;
    const hit = Number(total.value) >= Number(milestone.amount.value)
    return (
        <Card key={milestone.id} className={hit ? "text-success" : ""}>
            <Card.Body>
                <div className={"milestone"}>
                    <h3 className="h5">
                        <i className="bi bi-flag-fill"></i>{" "}
                        {milestone.name} {hit ? hitBadge : ""}
                    </h3>
                    <ProgressBar label={label} value={Number(total.value)} maxVal={Number(milestone.amount.value)} />
                </div>
            </Card.Body>
        </Card>
    )
}


function PollCards({ polls }: { polls: Poll[] }) {
    const [showAll, setShowAll] = useState(false);
    if (polls === undefined) return null;
    const showOption = polls.length >= 3;
    const ti = showOption ? polls.slice(0, 3) : polls;
    const content = sortMapSingle(showAll ? polls : ti, t => Number(t.amount_raised.value), p => <PollCard key={p.id} poll={p} />, true);
    const btn = <Button className="px-1 py-0" variant="outline-secondary" onClick={() => setShowAll(!showAll)}><span className="small">Show {showAll ? "Less" : "All"}</span></Button>;

    return <>
        <h2 className="mt-3">Polls {showOption ? btn : ""}</h2>
        <div className="donations">
            {content}
        </div>
    </>
}

function PollCard({ poll }: { poll: Poll }) {
    const winningVal = Math.max(...poll.options.map(o => Number(o.amount_raised.value)));
    return (
        <Card key={poll.id}>
            <Card.Body>
                <div className="poll">
                    <h3 className="h5">
                        <i className="bi bi-bar-chart-fill"></i>{" "}
                        {poll.name} <span className="ms-auto text-body-tertiary">Total: {formatAmount(poll.amount_raised)}</span>
                    </h3>
                    {poll.options.map(o => <ProgressBar key={o.name} className="mt-1" label={`${o.name} ${formatAmount(o.amount_raised)}`} value={Number(o.amount_raised.value)} maxVal={Number(poll.amount_raised.value)} complete={Number(o.amount_raised.value) >= winningVal} />)}
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
            {milestones && total ? <MilestoneCards milestones={milestones} total={total} /> : ""}
            {targets ? <TargetCards targets={targets} /> : ""}
            {polls ? <PollCards polls={polls} /> : ""}
            <h2 className="mt-3">Rewards</h2>
            <div className="donations">
                {sortMapSingle(rewards, t => Number(t.highlighted), r => <RewardCard key={r.id} reward={r} />)}
            </div>
        </>
    )
}
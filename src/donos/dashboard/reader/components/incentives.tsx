import '../reader.graphic.css';

import {
    Amount, Milestone, Milestones, Poll, Polls, Reward, Rewards, Target, Targets, Total
} from 'types/schemas/tiltify';
import { useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { useReplicant } from 'use-nodecg';

import { formatAmount, sortMapSingle } from '../utils';
import { ProgressBar } from './progress';
import { BarChartFill, FlagFill, StarFill } from 'react-bootstrap-icons';
import { formatTime } from 'common/utils/formats';

const hitBadge = <Badge bg="success-subtle" className="small text-success"> Hit</Badge>;

function start_date(date: string | null) {
    if (!date) return "";
    const start = new Date(date);
    const now = new Date(Date.now());
    if (now > start) return "";
    return "Starts " + formatTime(start);
}

function end_date(date: string | null) {
    if (!date) return "";
    const end = new Date(date);
    const now = new Date(Date.now());
    const nextday = now.getTime() + (24 * 60 * 60 * 1000);
    if (nextday < end.getTime()) return "";
    return (now < end ? "Ends " : "Ended ") + formatTime(end);
}

function dates(start: string | null, end: string | null) {
    if (!start && !end) return null;
    const start_txt = start_date(start);
    if (start_txt) return start_txt;
    const end_txt = end_date(end);
    return end_txt;

}

export function RewardCard({ reward, noFold }: { reward: Reward, noFold?: boolean }) {
    const date_txt = dates(reward.starts_at || null, reward.ends_at || null);

    const summ = <h3 className="h5 d-inline">
        <StarFill />{" "}
        {formatAmount(reward.amount)}: {reward.name}
        {date_txt ? (<span className="text-body-tertiary">{date_txt}</span>) : ""}
    </h3>

    const body = <>
        {reward.quantity_remaining && reward.quantity ? `${reward.quantity_remaining}/${reward.quantity} remaining` : ""}<br />
        {reward.description}
    </>

    return (
        <Card className={(reward.quantity_remaining == 0 || (reward.ends_at && new Date(reward.ends_at).getTime() < Date.now())) ? "read" : ""}>
            <Card.Body>
                {!noFold ? <details className="reward">
                    <summary>{summ}</summary>
                    {body}
                </details> : <>
                    {summ}
                    {body}
                </>}
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

export function TargetCard({ target }: { target: Target }) {
    var date_txt = dates(null, target.ends_at || null);
    const label = `${formatAmount(target.amount_raised)} / ${formatAmount(target.amount)}`;
    const hit = Number(target.amount_raised.value) >= Number(target.amount.value);

    return (
        <Card key={target.id} className={hit ? "text-success" : ""}>
            <Card.Body>
                <div className="target">
                    <h3 className="h5">
                        <StarFill />{" "}
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


export function findMilestones(ms: Milestone[] | undefined, total: Amount, n: number = 3) {
    // Pick an index so it shows the last hit milestone and next two
    const milestones = ms ? [...ms] : [];
    if (milestones.length <= n) return milestones;
    const threshold = Number(total.value);
    milestones.sort((a, b) => Number(a.amount.value) - Number(b.amount.value));
    const justHit = milestones.findIndex(m => Number(m.amount.value) > threshold);
    if (justHit === -1) return milestones.slice(milestones.length - n, milestones.length);
    const i = Math.min(milestones.length - n, Math.max(0, justHit - 1));
    return milestones.slice(i, i + n);
}

function MilestoneCards({ milestones, total, n }: { milestones: Milestone[], total: Total, n?: number }) {
    const [showAll, setShowAll] = useState(false);
    const showOption = milestones.length >= 3;
    const mi = findMilestones(milestones, total, n);
    const content = (showAll ? milestones : mi).map(m => <MilestoneCard key={m.id} milestone={m} total={total} />);
    const btn = <Button className="px-1 py-0" variant="outline-secondary" onClick={() => setShowAll(!showAll)}><span className="small">Show {showAll ? "Less" : "All"}</span></Button>;

    return <>
        <h2 className="mt-3">Milestones {showOption ? btn : ""}</h2>
        <div className="donations">
            {content}
        </div>
    </>

}


export function MilestoneCard({ milestone, total }: { milestone: Milestone, total: Total }) {
    const label = `${formatAmount(total)} / ${formatAmount(milestone.amount)}`;
    const hit = Number(total.value) >= Number(milestone.amount.value)
    return (
        <Card key={milestone.id} className={hit ? "text-success" : ""}>
            <Card.Body>
                <div className={"milestone"}>
                    <h3 className="h5">
                        <FlagFill />{" "}
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

export function PollCard({ poll }: { poll: Poll }) {
    const winningVal = Math.max(...poll.options.map(o => Number(o.amount_raised.value)));
    return (
        <Card key={poll.id}>
            <Card.Body>
                <div className="poll">
                    <h3 className="h5">
                        <BarChartFill />{" "}
                        {poll.name} <span className="ms-auto text-body-tertiary">Total: {formatAmount(poll.amount_raised)}</span>
                    </h3>
                    {poll.options.map(o => <ProgressBar key={o.name} className="mt-1" label={`${o.name} ${formatAmount(o.amount_raised)}`} value={Number(o.amount_raised.value)} maxVal={Number(poll.amount_raised.value)} complete={Number(o.amount_raised.value) >= winningVal} />)}
                </div>
            </Card.Body>
        </Card>
    )
}

export function Incentives() {
    const [rewards,] = useReplicant<Rewards>("rewards", [], { namespace: "tiltify" });
    const [targets,] = useReplicant<Targets>("targets", [], { namespace: "tiltify" });
    const [polls,] = useReplicant<Polls>("polls", [], { namespace: "tiltify" });
    const [milestones,] = useReplicant<Milestones>("milestones", [], { namespace: "tiltify" });
    const [total,] = useReplicant<Total>("total", { "currency": "GBP", "value": 0 }, { namespace: "tiltify" });

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
import {
    findMilestones, MilestoneCard, PollCard, RewardCard, TargetCard
} from 'nodecg-dono-control/src/dashboard/reader/components/incentives';
import { sortMapSingle } from 'nodecg-dono-control/src/dashboard/reader/utils';
import { Milestones, Polls, Rewards, Targets, Total } from 'nodecg-tiltify/src/types/schemas';
import React, { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { CustomBreakText } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

interface PageArgs {
    total?: Total;
    milestones?: Milestones;
    polls?: Polls;
    targets?: Targets;
    rewards?: Rewards;
    custom?: CustomBreakText;
}
type PageComp = (a: PageArgs) => JSX.Element | null;

function MilestonesComp({ milestones, total }: PageArgs) {
    if (!milestones || total === undefined) return null;
    const chosen = findMilestones(milestones, total, 4);
    if (!chosen) return null;
    return <>{chosen.map(m => <MilestoneCard milestone={m} total={total} />)}</>;
}

function PollsComp({ polls }: PageArgs) {
    if (!polls) return null;
    return <>{sortMapSingle(polls, t => Number(t.amount_raised.value), p => <PollCard key={p.id} poll={p} />, true, 4)}</>;
}

function TargetsComp({ targets }: PageArgs) {
    if (!targets) return null;
    return <>{sortMapSingle(targets, t => Number(t.amount_raised.value), t => <TargetCard key={t.id} target={t} />, true, 4)}</>;
}

function RewardComp({ rewards }: PageArgs) {
    if (!rewards) return null;
    return <>{sortMapSingle(rewards, t => Number(t.highlighted), r => <RewardCard key={r.id} reward={r} />)}</>
}

function AboutComp({ custom }: PageArgs) {
    if (!custom) return null;
    return <Markdown>{custom}</Markdown>
}

const pages = [AboutComp, MilestonesComp, PollsComp, TargetsComp];

export function Slides() {
    const [index, setIndex] = useState(0);
    const [Func, setFunc] = useState<PageComp>(() => AboutComp);

    const [total,] = useReplicant<Total>("total", { "currency": "GBP", "value": 0 }, { namespace: "nodecg-tiltify" });
    const [milestones,] = useReplicant<Milestones>("milestones", [], { namespace: "nodecg-tiltify" });
    const [polls,] = useReplicant<Polls>("polls", [], { namespace: "nodecg-tiltify" });
    const [targets,] = useReplicant<Targets>("targets", [], { namespace: "nodecg-tiltify" });
    const [rewards,] = useReplicant<Rewards>("rewards", [], { namespace: "nodecg-tiltify" });
    const [custom,] = useReplicant<CustomBreakText>("custom", "");

    const args = { total, milestones, polls, targets, rewards, custom };
    console.log(index, Func, "args", args);

    useEffect(() => {
        const interval = setInterval(() => {
            var newIndex = index + 1;
            for (let i = 1; i < pages.length + 1; i++) {
                newIndex = (index + i) % pages.length;
                const NewFunc = pages[newIndex];
                if (<NewFunc {...args} /> !== null) break;
            }
            setIndex(newIndex);
            setFunc(() => pages[newIndex]);
        }, 5000);
        return () => clearInterval(interval);
    }, [index]);

    return <div className="m-3">
        {<Func {...args} />}
    </div>
}
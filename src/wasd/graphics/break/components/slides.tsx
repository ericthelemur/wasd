// import 'nodecg-dono-control/src/dashboard/reader/reader.graphic.css';
import { msToApproxTimeString } from '../../../../countdown/utils';
import './slides.scss';

import Markdown from 'markdown-to-jsx';
import { useReplicant } from 'use-nodecg';
import { findMilestones, MilestoneCard, PollCard, RewardCard, TargetCard } from 'donos/dashboard/reader/components/incentives';
import { sortMapSingle } from 'donos/dashboard/reader/utils';
import { Milestones, Polls, Rewards, Targets, Total } from 'types/schemas/tiltify';
import React, { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import { Textfit } from 'react-textfit';
import { RunData, RunDataActiveRun, RunDataArray } from 'speedcontrol-util/types/speedcontrol';
import { RunDataActiveRunSurrounding } from 'speedcontrol-util/types/speedcontrol/schemas';
import { CustomBreakText, StreamState } from 'types/schemas';
import { RunCard } from './runcard';

interface PageArgs {
    total?: Total;
    milestones?: Milestones;
    polls?: Polls;
    targets?: Targets;
    rewards?: Rewards;
    custom?: CustomBreakText;
    runDataActiveRunSurrounding?: RunDataActiveRunSurrounding;
    runDataArray?: RunDataArray;
    state?: StreamState;
}
type PageComp = (a: PageArgs) => JSX.Element | null;

function MilestonesComp({ milestones, total }: PageArgs) {
    if (!milestones || total === undefined) return null;
    const chosen = findMilestones(milestones, total, 3);
    if (!chosen) return null;
    return <>
        <h1>Donation Milestones:</h1>
        <div className="upcoming vstack fb">
            {chosen.map(m => <MilestoneCard key={m.id} milestone={m} total={total} />)}
        </div>
    </>
}

function PollsComp({ polls }: PageArgs) {
    if (!polls) return null;
    return <>
        <h1>Donation Polls:</h1>
        <div className="upcoming vstack fb">
            {sortMapSingle(polls, t => Number(t.amount_raised.value), p => <PollCard key={p.id} poll={p} />, true, 2)}
        </div>
    </>
}

function TargetsComp({ targets }: PageArgs) {
    if (!targets) return null;
    return <>
        <h1>Donation Targets:</h1>
        <div className="upcoming vstack fb">
            {sortMapSingle(targets, t => Number(t.amount_raised.value) - 0.1 * Number(t.amount.value), t => <TargetCard key={t.id} target={t} />, false, 3)}
        </div>
    </>
}

function RewardComp({ rewards }: PageArgs) {
    if (!rewards) return null;
    return <>
        <h1>Donation Rewards:</h1>
        <div className="upcoming vstack fb">
            {sortMapSingle(rewards, t => Number(t.highlighted), r => <RewardCard key={r.id} reward={r} noFold={true} />, false, 3)}
        </div>
    </>
}

function MarkdownPage({ md, title }: { md?: string, title?: string }) {
    if (!md) return null;
    return <>
        {title && <h1>{title}</h1>}
        <Textfit max={40} className="h-100 fw-medium"><Markdown>{md}</Markdown></Textfit>
    </>
}

function AboutComp({ custom }: PageArgs) {
    if (!custom) return null;
    return MarkdownPage({ md: custom.about, title: "About WASD" });
}

function CharityComp({ custom }: PageArgs) {
    if (!custom) return null;
    return MarkdownPage({ md: custom.charity, title: "SpecialEffect" });
}

function CustomComp({ custom }: PageArgs) {
    if (!custom) return null;
    return MarkdownPage({ md: custom.custom });
}


function RunsComp({ runDataArray, runDataActiveRunSurrounding, state }: PageArgs) {
    if (!runDataArray || !runDataActiveRunSurrounding || !state) return null;

    function findRunIndex(arg?: RunData | string | null): number {
        let runId = arg;
        if (arg && typeof arg !== 'string') runId = arg.id;
        return runDataArray!.findIndex((run) => run.id === runId);
    }

    function getNextRuns(amount = 4) {
        const nextRun = runDataActiveRunSurrounding ? runDataActiveRunSurrounding.next : undefined;
        let runIndex = findRunIndex(nextRun);
        return runDataArray!.slice(runIndex, runIndex + amount);
    }

    let nextRuns = getNextRuns(4);
    nextRuns = nextRuns.slice(1);
    if (!nextRuns) return null;

    let delaying = true;
    return <>
        <h1>
            Coming Up Later:{" "}
            {state?.minsBehind && <small className="fs-2">~{Math.abs(state?.minsBehind)} mins {state?.minsBehind > 0 ? "behind" : "ahead"}</small>}
        </h1>
        <div className="upcoming vstack fb">
            {nextRuns.map(r => {
                if (!r.category) delaying = false;
                return <RunCard key={r.id} run={r} delay={delaying} />
            })}
        </div>
    </>
}

interface PageCandidate {
    page: (args: PageArgs) => React.JSX.Element | null;
    condition: (args: PageArgs) => boolean;
    duration?: number;
}

const pages: PageCandidate[] = [{
    //     page: RunsComp,
    //     condition: (args) => !args.custom?.disabled?.runs && Boolean(args.runDataActiveRunSurrounding?.next),
    //     duration: 10
    // }, {
    //     page: CharityComp,
    //     condition: (args) => !args.custom?.disabled?.charity && Boolean(args.custom?.charity)
    // }, {
    //     page: AboutComp,
    //     condition: (args) => !args.custom?.disabled?.about && Boolean(args.custom?.about)
    // }, {
    //     page: CustomComp,
    //     condition: (args) => !args.custom?.disabled?.custom && Boolean(args.custom?.custom)
    // }, {
    page: PollsComp,
    condition: (args) => !args.custom?.disabled?.polls && args.polls != undefined && args.polls.length > 0
    // }, {
    //     page: MilestonesComp,
    //     condition: (args) => !args.custom?.disabled?.milestones && args.milestones != undefined && args.milestones?.length > 0
    // }, {
    //     page: RewardComp,
    //     condition: (args) => !args.custom?.disabled?.rewards && args.rewards != undefined && args.rewards?.length > 0
    // }, {
    //     page: TargetsComp,
    //     condition: (args) => !args.custom?.disabled?.targets && args.targets != undefined && args.targets?.length > 0
}
]

function shufflePages() {
    for (var i = pages.length - 1; i >= 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = pages[i];
        pages[i] = pages[j];
        pages[j] = temp;
    }
}

function HR() {
    return <div style={{ width: "100%", height: "var(--bw)", backgroundColor: "white" }} />
}

export function UpNext({ className }: { className?: string }) {
    const [runDataArray,] = useReplicant<RunDataArray>("runDataArray", [], { namespace: "nodecg-speedcontrol" });
    const [runDataActiveRunSurrounding,] = useReplicant<RunDataActiveRunSurrounding>("runDataActiveRunSurrounding", { previous: undefined, current: undefined, next: undefined }, { namespace: "nodecg-speedcontrol" });

    const runId = runDataActiveRunSurrounding?.next;
    const run = runDataArray && runId ? runDataArray.find(r => r.id === runId) : undefined;

    return <div className="text-center">
        <h1>{run ? "Up Next:" : "That's It!"}</h1>
        {run ? <RunCard run={run} delay={true} isNext={true} /> : "Thanks for watching! Tune back in next year"}
    </div>
}

export function Slides({ side }: { side?: boolean }) {
    const [index, setIndex] = useState(0);
    const [Func, setFunc] = useState<PageComp>(() => AboutComp);

    const [total,] = useReplicant<Total>("total", { "currency": "GBP", "value": 0 });
    const [milestones,] = useReplicant<Milestones>("milestones", []);
    const [polls,] = useReplicant<Polls>("polls", []);
    const [targets,] = useReplicant<Targets>("targets", []);
    const [rewards,] = useReplicant<Rewards>("rewards", []);
    const [runDataArray,] = useReplicant<RunDataArray>("runDataArray", [], { namespace: "nodecg-speedcontrol" });
    const [runDataActiveRunSurrounding,] = useReplicant<RunDataActiveRunSurrounding>("runDataActiveRunSurrounding", { previous: undefined, current: undefined, next: undefined }, { namespace: "nodecg-speedcontrol" });
    const [custom,] = useReplicant<CustomBreakText>("customBreakText", {});
    const [state,] = useReplicant<StreamState>("streamState", { "state": "BREAK" });
    const [refreshTime, setRefreshTime] = useState<number>(Date.now());

    const args = { total, milestones, polls, targets, rewards, custom, runDataArray, runDataActiveRunSurrounding, state };

    // Rotate through pages
    useEffect(() => {
        const time = refreshTime - Date.now() + (pages[index].duration ?? 5) * 1000;
        const interval = setTimeout(() => {
            const args = { total, milestones, polls, targets, rewards, custom, runDataArray, runDataActiveRunSurrounding, state };
            let newIndex = 0;
            for (let i = 1; i < pages.length * 2; i++) {
                newIndex = (index + i) % pages.length;
                if (newIndex == 0) shufflePages();
                const { condition } = pages[newIndex];
                if (condition(args)) {
                    break;
                }
            }
            setIndex(newIndex);
            setFunc(() => pages[newIndex].page);
            setRefreshTime(Date.now());
        }, time > 0 ? time : 1);
        return () => clearInterval(interval);
    }, [index, total, milestones, polls, targets, rewards, custom, runDataArray, runDataActiveRunSurrounding, state]);


    const page = <Func {...args} />
    return <div className="w-100 h-100 d-flex flex-column next-run">
        {!side && <><div className="p-5 pt-4">
            <UpNext />
        </div>
            <HR />
        </>}
        <div className={"vstack fb " + (side ? "ps-5" : "p-5 pt-4")} style={{ fontSize: "0.9em" }}>
            {page}
        </div>
    </div >
}
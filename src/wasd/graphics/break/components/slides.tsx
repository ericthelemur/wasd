// import 'nodecg-dono-control/src/dashboard/reader/reader.graphic.css';
import { msToApproxTimeString } from '../../../../countdown/utils';
import './slides.scss';

import Markdown from 'markdown-to-jsx';
// import {
//     findMilestones, MilestoneCard, PollCard, RewardCard, TargetCard
// } from 'nodecg-dono-control/src/dashboard/reader/components/incentives';
// import { sortMapSingle } from 'nodecg-dono-control/src/dashboard/reader/utils';
// import { Milestones, Polls, Rewards, Targets, Total } from 'nodecg-tiltify/src/types/schemas';
import React, { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import { Textfit } from 'react-textfit';
import { RunData, RunDataActiveRun, RunDataArray } from 'speedcontrol-util/types/speedcontrol';
import { RunDataActiveRunSurrounding } from 'speedcontrol-util/types/speedcontrol/schemas';
import { CustomBreakText } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

interface PageArgs {
    total?: Total;
    milestones?: Milestones;
    polls?: Polls;
    targets?: Targets;
    rewards?: Rewards;
    custom?: CustomBreakText;
    runDataActiveRunSurrounding?: RunDataActiveRunSurrounding;
    runDataArray?: RunDataArray;
}
type PageComp = (a: PageArgs) => JSX.Element | null;

// function MilestonesComp({ milestones, total }: PageArgs) {
//     if (!milestones || total === undefined) return null;
//     const chosen = findMilestones(milestones, total, 3);
//     if (!chosen) return null;
//     return <>
//         <h3>Donation Milestones:</h3>
//         <div className="upcoming vstack fb">
//             {chosen.map(m => <MilestoneCard key={m.id} milestone={m} total={total} />)}
//         </div>
//     </>
// }

// function PollsComp({ polls }: PageArgs) {
//     if (!polls) return null;
//     return <>
//         <h3>Donation Polls:</h3>
//         <div className="upcoming vstack fb">
//             {sortMapSingle(polls, t => Number(t.amount_raised.value), p => <PollCard key={p.id} poll={p} />, true, 2)}
//         </div>
//     </>
// }

// function TargetsComp({ targets }: PageArgs) {
//     if (!targets) return null;
//     return <>
//         <h3>Donation Targets:</h3>
//         <div className="upcoming vstack fb">
//             {sortMapSingle(targets, t => Number(t.amount_raised.value) - 0.1 * Number(t.amount.value), t => <TargetCard key={t.id} target={t} />, false, 3)}
//         </div>
//     </>
// }

// function RewardComp({ rewards }: PageArgs) {
//     if (!rewards) return null;
//     return <>
//         <h3>Donation Rewards:</h3>
//         <div className="upcoming vstack fb">
//             {sortMapSingle(rewards, t => Number(t.highlighted), r => <RewardCard key={r.id} reward={r} />, false, 3)}
//         </div>
//     </>
// }

function MarkdownPage({ md, title }: { md?: string, title?: string }) {
    if (!md) return null;
    return <>
        <h3>{title}</h3>
        <Textfit max={40} className="h-100"><Markdown>{md}</Markdown></Textfit>
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

function RunCard({ run }: { run: RunData }) {
    if (!run) return null;

    const runners = run.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. ");
    const info = [runners, msToApproxTimeString((run.estimateS || 0) * 1000), run.category, run.system, run.release].filter(v => v);

    const date = new Date(run.scheduled!);
    const dateStr = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
    // console.log("now", Date.now(), new Date(run.scheduled!), Date.now() - new Date(run.scheduled!).getUTCMilliseconds())
    // const durStr = msToApproxTimeString(1000 * new Date(run.scheduled!).getUTCMilliseconds() - Date.now());

    return <Card key={run.id}>
        <Card.Body className='p-2'>
            <div className="game">
                <h2>
                    <Textfit mode="single" max={50}>
                        <span className="fw-bold">{run.game}</span>{" at "}<span className="fw-bold">{dateStr}</span>
                    </Textfit>
                    <Textfit mode="single" max={55}>
                        <div style={{ marginTop: 3, fontSize: "0.6em", lineHeight: 1 }}>{info.join(" / ")}</div>
                    </Textfit>
                </h2>
            </div>
        </Card.Body>
    </Card>
}

function RunsComp({ runDataArray, runDataActiveRunSurrounding }: PageArgs) {
    if (!runDataArray || !runDataActiveRunSurrounding) return null;

    function findRunIndex(arg?: RunData | string | null): number {
        let runId = arg;
        if (arg && typeof arg !== 'string') runId = arg.id;
        return runDataArray!.findIndex((run) => run.id === runId);
    }

    function getNextRuns(amount = 4) {
        const nextRun = runDataActiveRunSurrounding ? runDataActiveRunSurrounding.next : undefined;
        let runIndex = findRunIndex(nextRun);
        if (runIndex > runDataArray!.length - 2) return null;
        return runDataArray!.slice(runIndex + 1, runIndex + 1 + amount);
    }

    const nextRuns = getNextRuns(3);
    if (!nextRuns) return null;
    return <>
        <h1>Coming Up Later:</h1>
        <div className="upcoming vstack fb">
            {nextRuns.map(r => <RunCard run={r} />)}
        </div>
    </>
}

// const pages = [AboutComp, MilestonesComp, RunsComp, CharityComp, PollsComp, TargetsComp, RunsComp];
// const pages = [AboutComp, RunsComp, CharityComp, RunsComp];
const pages = [RunsComp];

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
        {run ? <RunCard run={run} /> : "Thanks for watching! Tune back in next year"}
    </div>
}

export function Slides({ side }: { side?: boolean }) {
    const [index, setIndex] = useState(0);
    const [Func, setFunc] = useState<PageComp>(() => AboutComp);

    // const [total,] = useReplicant<Total>("total", { "currency": "GBP", "value": 0 }, { namespace: "nodecg-tiltify" });
    // const [milestones,] = useReplicant<Milestones>("milestones", [], { namespace: "nodecg-tiltify" });
    // const [polls,] = useReplicant<Polls>("polls", [], { namespace: "nodecg-tiltify" });
    // const [targets,] = useReplicant<Targets>("targets", [], { namespace: "nodecg-tiltify" });
    // const [rewards,] = useReplicant<Rewards>("rewards", [], { namespace: "nodecg-tiltify" });
    const [runDataArray,] = useReplicant<RunDataArray>("runDataArray", [], { namespace: "nodecg-speedcontrol" });
    const [runDataActiveRunSurrounding,] = useReplicant<RunDataActiveRunSurrounding>("runDataActiveRunSurrounding", { previous: undefined, current: undefined, next: undefined }, { namespace: "nodecg-speedcontrol" });
    const [custom,] = useReplicant<CustomBreakText>("customBreakText", {});

    // const args = { total, milestones, polls, targets, rewards, custom, runDataArray, runDataActiveRunSurrounding };
    const args = { custom, runDataArray, runDataActiveRunSurrounding };

    // Rotate through pages
    useEffect(() => {
        const interval = setInterval(() => {
            // const args = { total, milestones, polls, targets, rewards, custom, runDataArray, runDataActiveRunSurrounding };
            const args = { custom, runDataArray, runDataActiveRunSurrounding };
            var newIndex = (index + 1) % pages.length;
            for (let i = 1; i < pages.length + 1; i++) {
                newIndex = (index + i) % pages.length;
                const newFunc = pages[newIndex];
                const result = newFunc(args);
                if (result && result.props.children) break;
            }
            setIndex(newIndex);
            setFunc(() => pages[newIndex]);
        }, 5000);
        return () => clearInterval(interval);
        // }, [index, total, milestones, polls, targets, rewards, custom, runDataArray, runDataActiveRunSurrounding]);
    }, [index, custom, runDataArray, runDataActiveRunSurrounding]);


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
// import 'nodecg-dono-control/src/dashboard/reader/reader.graphic.css';
import './slides.scss';

import Markdown from 'markdown-to-jsx';
import {
    findMilestones, MilestoneCard, PollCard, RewardCard, TargetCard
} from 'nodecg-dono-control/src/dashboard/reader/components/incentives';
import { sortMapSingle } from 'nodecg-dono-control/src/dashboard/reader/utils';
import { Milestones, Polls, Rewards, Targets, Total } from 'nodecg-tiltify/src/types/schemas';
import React, { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import { Textfit } from 'react-textfit';
import { RunData, RunDataActiveRun, RunDataArray } from 'speedcontrol-util/types/speedcontrol';
import { RunDataActiveRunSurrounding } from 'speedcontrol-util/types/speedcontrol/schemas';
import { CustomBreakText } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import SpecialEffect from '../../assets/specialeffect-white.png';
import WASDKeys from '../../assets/wasd-keys.svg';

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

function MarkdownPage({ md }: { md?: string }) {
    if (!md) return null;
    return <Textfit max={32} className="h-100"><Markdown>{md}</Markdown></Textfit>
}

function AboutComp({ custom }: PageArgs) {
    if (!custom) return null;
    return <MarkdownPage md={custom.about} />
}


function CharityComp({ custom }: PageArgs) {
    if (!custom) return null;
    return <MarkdownPage md={custom.charity} />
}

function formatDuration(durMS: number) {
    const totalMins = durMS / (60);
    const mins = Math.floor(totalMins % 60);
    const hrs = Math.floor(totalMins / 60);
    console.log(durMS, totalMins, mins, hrs);
    if (hrs <= 0 && mins <= 2) return "now!"
    return hrs ? `${hrs} hour${hrs !== 1 ? "s" : ""}` : `${mins} min${mins !== 1 ? "s" : ""}`;
}

function RunCard({ run }: { run: RunData }) {
    if (!run) return null;

    const runners = run.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. ");
    const info = [runners, run.estimate?.replace(/:?0*$/, ""), run.category, run.system, run.release].filter(v => v);

    const date = new Date(run.scheduled!);
    const dateStr = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
    // console.log("now", Date.now(), new Date(run.scheduled!), Date.now() - new Date(run.scheduled!).getUTCMilliseconds())
    // const durStr = formatDuration(Date.now() - 1000 * new Date(run.scheduled!).getUTCMilliseconds());

    return <Card key={run.id}>
        <Card.Body>
            <div className="game">
                <h2>
                    {run.game} at {dateStr}
                    <div style={{ marginTop: 3, fontSize: "0.6em", lineHeight: 1 }}>{info.join(" / ")}</div>
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

    function getNextRuns(amount = 4, run?: RunData | null): RunData[] {
        const nextRun = runDataActiveRunSurrounding ? runDataActiveRunSurrounding.next : undefined;
        let runIndex = findRunIndex(run || nextRun);
        runIndex = (run) ? runIndex += 1 : runIndex;
        return runDataArray!.slice(runIndex, runIndex + amount);
    }

    return <>{getNextRuns().map(r => <RunCard run={r} />)}</>
}

// const pages = [AboutComp, MilestonesComp, RunsComp, PollsComp, TargetsComp, RunsComp];
const pages = [AboutComp, CharityComp];

export function Slides() {
    const [index, setIndex] = useState(0);
    const [Func, setFunc] = useState<PageComp>(() => AboutComp);

    const [total,] = useReplicant<Total>("total", { "currency": "GBP", "value": 0 }, { namespace: "nodecg-tiltify" });
    const [milestones,] = useReplicant<Milestones>("milestones", [], { namespace: "nodecg-tiltify" });
    const [polls,] = useReplicant<Polls>("polls", [], { namespace: "nodecg-tiltify" });
    const [targets,] = useReplicant<Targets>("targets", [], { namespace: "nodecg-tiltify" });
    const [rewards,] = useReplicant<Rewards>("rewards", [], { namespace: "nodecg-tiltify" });
    const [runDataArray,] = useReplicant<RunDataArray>("runDataArray", [], { namespace: "nodecg-speedcontrol" });
    const [runDataActiveRunSurrounding,] = useReplicant<RunDataActiveRunSurrounding>("runDataActiveRunSurrounding", { previous: undefined, current: undefined, next: undefined }, { namespace: "nodecg-speedcontrol" });
    const [custom,] = useReplicant<CustomBreakText>("customBreakText", {});

    const args = { total, milestones, polls, targets, rewards, custom, runDataArray, runDataActiveRunSurrounding };
    console.log(custom);

    // Rotate through pages
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

    const runId = runDataActiveRunSurrounding?.next;
    const run = runDataArray && runId ? runDataArray.find(r => r.id === runId) : undefined;
    console.log("rid", runId, run);
    return <div className="p-5 w-100 h-100 d-flex flex-column next-run">
        <div>
            <h1>{run ? "Up Next:" : "That's It!"}</h1>
            {run ? <RunCard run={run} /> : "Thanks for watching! Tune back in next year:\nSame Bat Time, same Bat Channel"}
        </div>
        <hr />
        <div style={{ flex: "1 1 0" }}>
            {<Func {...args} />}
        </div>
    </div >
}
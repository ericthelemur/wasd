import { Polls, Rewards, Targets } from 'types/schemas/tiltify';
import { useReplicant } from 'use-nodecg';

import { truncate } from '../utils/index';

function Reward({ id }: { id: string }) {
    const [rewards, _] = useReplicant<Rewards>("rewards", [], { namespace: "nodecg-tiltify" });
    if (rewards === undefined) return null;
    const reward = rewards.find(r => r.id === id);
    if (reward === undefined) return null;
    return (
        <span className="reward text-body-tertiary">
            <i className="bi bi-star-fill"></i>{" "}
            {reward.name}
        </span>
    )
}


function Target({ id }: { id: string }) {
    const [targets, _] = useReplicant<Targets>("targets", [], { namespace: "nodecg-tiltify" });
    if (targets === undefined) return null;
    const target = targets.find(r => r.id === id);
    if (target === undefined) return null;
    return (
        <span className="target">
            <i className="bi bi-bullseye"></i>{" "}
            {target.name}
        </span>
    )
}


function Poll({ id, option_id }: { id: string, option_id: string }) {
    console.log("args", id, option_id);
    const [polls, _] = useReplicant<Polls>("polls", [], { namespace: "nodecg-tiltify" });
    if (polls === undefined) return null;

    const poll = polls.find(r => r.id === id);
    console.log("poll", poll);
    if (poll === undefined) return null;

    const option = poll.options.find(o => o.id === option_id);
    console.log("option", option);
    if (option === undefined) return null;

    return (
        <span className="poll">
            <i className="bi bi-bar-chart-fill"></i>{" "}
            {option.name} <span className="text-body-tertiary">/ {truncate(poll.name, 30)}</span>
        </span>
    )
}


export interface IncentivesProps {
    reward_id?: string | null;
    target_id?: string | null;
    poll_id?: string | null;
    poll_option_id?: string | null;
}

export function Incentives(props: IncentivesProps) {
    const { reward_id, target_id, poll_id, poll_option_id } = props;
    return (
        <div className="incentives">
            {target_id ? <Target id={target_id} /> : ""}
            {poll_id && poll_option_id ? <Poll id={poll_id} option_id={poll_option_id} /> : ""}
            {reward_id ? <Reward id={reward_id} /> : ""}
        </div>
    )
}
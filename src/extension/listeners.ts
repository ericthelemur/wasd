import SpeedcontrolUtil from 'speedcontrol-util';
import { NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';

import { listenTo } from '../common/listeners';
import { people, peopleBank } from './replicants';
import { getNodeCG } from './utils';

const nodecg = getNodeCG();

listenTo("setPerson", ({ id, person }) => {
    peopleBank.value[id] = person;
});

// Load runners into all list
listenTo("loadRunners", ({ }) => {
    if (nodecg.extensions["nodecg-speedcontrol"]) {
        nodecg.log.info("SC enabled");
        const sc = new SpeedcontrolUtil(nodecg as unknown as NodeCGServer);
        const runs = sc.runDataArray;
        nodecg.log.info("Starting runner import");
        for (const r of runs.value) {
            for (const t of r.teams) {
                for (const p of t.players) {
                    if (p.id in peopleBank.value) {
                        // Update existing person
                        nodecg.log.info("Updating runner", p.name);
                        const existing = peopleBank.value[p.id];
                        existing.name = p.name;
                        existing.pronouns = p.pronouns ?? "";
                        const twitch = existing.socials.find(s => s.social === "twitch");
                        if (twitch) twitch.name = p.social.twitch ?? "";
                        else existing.socials.push({ id: "twitch", social: "twitch", name: p.social.twitch ?? "" });
                    } else {
                        // Add new
                        nodecg.log.info("Creating runner", p.name);
                        peopleBank.value[p.id] = {
                            "name": p.name,
                            "pronouns": p.pronouns ?? "",
                            "socials": [
                                { id: "twitch", social: "twitch", name: p.social.twitch ?? "" }
                            ]
                        }
                        people.value.all.people.push(p.id);
                    }
                }
            }
        }
    }
});


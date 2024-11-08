import SpeedcontrolUtil from 'speedcontrol-util';
import { NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';

import { listenTo } from '../common/listeners';
import { people, peopleBank } from './replicants';
import { getNodeCG } from './utils';

const nodecg = getNodeCG();

listenTo("setPerson", ({ id, person }) => {
    peopleBank.value[id] = person;
});

nodecg.listenFor("importOengusSchedule", "nodecg-speedcontrol", async (data, ack) => {
    try {
        const code = data.marathonShort;
        const schList = await fetch(`https://oengus.io/api/v1/marathons/${code}/schedule`, { headers: { accept: "application/json" } });
        const lines = await schList.json();

        lines.lines.map((line: any) => {
            line.runners.map((p: any) => {
                if (p.displayName) {
                    const newP = {
                        name: p.displayName,
                        pronouns: p.pronouns?.length > 0 ? p.pronouns[0] : "",
                        socials: p.connections.map((c: any) => ({ id: c.id.toString(), social: c.platform.toLowerCase(), name: c.username }))
                    }
                    const id = p.id.toString();
                    peopleBank.value[id] = newP;
                    if (people.value.all.people.includes(id)) {
                        people.value.all.people.push(id);
                    }
                }
            })
        });
    } catch (e) {
        nodecg.log.error(e);
    }
});



// Load runners into all list
// listenTo("loadRunners", ({ }) => {
//     if (nodecg.extensions["nodecg-speedcontrol"]) {
//         nodecg.log.info("SC enabled");
//         const sc = new SpeedcontrolUtil(nodecg as unknown as NodeCGServer);
//         const runs = sc.runDataArray;
//         nodecg.log.info("Starting runner import");
//         for (const r of runs.value) {
//             for (const t of r.teams) {
//                 for (const p of t.players) {
//                     if (p.id in peopleBank.value) {
//                         // Update existing person
//                         nodecg.log.info("Updating runner", p.name, p);
//                         const existing = peopleBank.value[p.id];
//                         existing.name = p.name;
//                         existing.pronouns = p.pronouns ?? "";
//                         const twitch = existing.socials.find(s => s.social === "twitch");
//                         if (twitch) twitch.name = p.social.twitch ?? "";
//                         else existing.socials.push({ id: "twitch", social: "twitch", name: p.social.twitch ?? "" });
//                     } else {
//                         // Add new
//                         nodecg.log.info("Creating runner", p.name, p);
//                         peopleBank.value[p.id] = {
//                             "name": p.name,
//                             "pronouns": p.pronouns ?? "",
//                             "socials": [
//                                 { id: "twitch", social: "twitch", name: p.social.twitch ?? "" }
//                             ]
//                         }
//                         people.value.all.people.push(p.id);
//                     }
//                 }
//             }
//         }
//     }
// });


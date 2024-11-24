import { RunDataPlayer } from 'speedcontrol-util/types/speedcontrol';
import { getNodeCG } from '../../common/utils';
import { config, sc } from '../../wasd/extension/replicants';
import { listenTo } from '../common/listeners';
import { people, peopleBank } from './replicants';
import { OengusImportStatus } from 'speedcontrol-util/types/speedcontrol/schemas';
import NodeCG from '@nodecg/types';
import { Person } from 'types/schemas';

const nodecg = getNodeCG();

listenTo("setPerson", ({ id, person }) => {
    peopleBank.value[id] = person;
});


// Pull people from Oengus

export const oengusImportStatus = nodecg.Replicant<OengusImportStatus>('oengusImportStatus', "nodecg-speedcontrol", { persistent: false }) as unknown as NodeCG.ServerReplicantWithSchemaDefault<OengusImportStatus>;

async function loadOengusPeople() {
    // Lookup oengus info directly to get more socials
    // speedcontrol filters it down to twitch & youtube only
    try {
        const code = config.value.oengusShortcode;
        if (!code) return;
        // Fetch info from Oengus
        const schList = await fetch(`https://oengus.io/api/v1/marathons/${code}/schedule`, { headers: { accept: "application/json" } });
        if (schList.status == 404) return nodecg.log.error("Marathon code", code, "does not exist");
        const lines = await schList.json();
        nodecg.log.info("Loaded schedule JSON");

        // Fetch info from 
        let schPeople: { [name: string]: { scID?: string, id: number, name: string, pronouns: string, socials: { id: string, social: string, name: string }[] } } = {};
        lines.lines.map((line: any) => {
            line.runners.map((p: any) => {
                if (p.displayName || p.username) {
                    const newP = {
                        id: p.id,
                        name: p.displayName || p.username,
                        pronouns: p.pronouns?.length > 0 ? p.pronouns[0] : "",
                        socials: p.connections.map((c: any) => ({ id: c.id.toString(), social: c.platform.toLowerCase(), name: c.username }))
                    }
                    schPeople[newP.name] = newP;
                }
            })
        });

        sc.getRunDataArray().forEach((run) => {
            run.teams.forEach(team => {
                team.players.forEach(player => {
                    const pdata = schPeople[player.name];
                    pdata.scID = player.id;
                    if (!pdata.pronouns && player.pronouns) pdata.pronouns = player.pronouns;

                    if (player.social.twitch) {
                        const twitchSocial = pdata.socials.find(s => s.social == "twitch");
                        if (twitchSocial) twitchSocial.name = player.social.twitch;
                        else if (!twitchSocial) pdata.socials.push({ id: "twitch", social: "twitch", name: player.social.twitch });
                    }
                })
            })
        });

        Object.values(schPeople).forEach(p => {
            let id = p.id != -1 ? p.id.toString() : p.name;
            peopleBank.value[id] = p;
            if (!people.value.all.people.includes(id)) {
                people.value.all.people.push(id);
            }
        });

        nodecg.log.info("Loading runners complete");
    } catch (e) {
        nodecg.log.error(e);
    }
}

// Since speedcontrol doesn't expose the marathon code nicely
nodecg.listenFor("importOengusSchedule", "nodecg-speedcontrol", async (data, ack) => {
    config.value.oengusShortcode = data.marathonShort;
    // loadOengusPeople();
});

listenTo("loadRunners", ({ code }) => {
    if (code) {
        config.value.oengusShortcode = code;
        // loadOengusPeople();
    }
});



oengusImportStatus.on("change", (newVal, oldVal) => {
    if (oldVal && newVal && oldVal.importing == true && newVal.importing == false) {
        loadOengusPeople();
    }
});













// Update runners category with speedcontrol

nodecg.listenFor("changeToNextRun", "nodecg-speedcontrol", async (data, ack) => {
    // Update runners category
    // or do this in control panel? - probably?
});

// nodecg.listenFor("changeActiveRun", "nodecg-speedcontrol", async (data, ack) => {
//     // Also here
// });

sc.runDataActiveRun.on("change", (run) => {
    let runners: RunDataPlayer[] = [];

    if (run) {
        if (run.teams.length <= 1) {
            runners = run.teams[0].players;

            if (people.value.runners) people.value.runners.hide = false;
            if (people.value.team1) people.value.team1.hide = true;
            if (people.value.team2) people.value.team2.hide = true;

            people.value.runners.people = []
        }

        // for (let team in run.teams) {
        //     teams
        // }
    }
});
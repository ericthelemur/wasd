import { RunDataPlayer } from 'speedcontrol-util/types/speedcontrol';
import { getNodeCG } from '../../common/utils';
import { config, sc } from '../../wasd/extension/replicants';
import { listenTo } from '../messages';
import { people, peopleBank } from './replicants';
import { OengusImportStatus } from 'speedcontrol-util/types/speedcontrol/schemas';
import NodeCG from '@nodecg/types';
import { Person } from 'types/schemas';
import { klona } from 'klona';

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
// nodecg.listenFor("changeToNextRun", "nodecg-speedcontrol", async (data, ack) => {
// nodecg.listenFor("changeActiveRun", "nodecg-speedcontrol", async (data, ack) => {

sc.runDataActiveRun.on("change", (run) => {
    let runners: RunDataPlayer[] = [];

    const teamKeys = Object.keys(people.value).filter(n => n.startsWith("team"));
    teamKeys.forEach(t => delete people.value[t]);

    if (!run || run.teams.length == 0) {
        people.value.runners.people = [];
        return;
    }

    let allRunners: [string, Person][] = [];

    run.teams.forEach((team, i) => {
        runners = team.players;

        let teamPeople = [];

        for (let runner of runners) {
            let person = Object.entries(peopleBank.value).find(([k, p]) => p.scID == runner.id);
            if (!person) person = Object.entries(peopleBank.value).find(([k, p]) => p.name == runner.name);

            if (!person) {
                // Create dummy person if not existing
                nodecg.log.warn(`Person not found for runner ${runner.name} (${runner.id})`);
                let id = runner.name || runner.id.toString();
                const socials = [];

                if (runner.social.twitch) socials.push({ id: "twitch", social: "twitch", name: runner.social.twitch });
                if ((runner.social as any).youtube) socials.push({ id: "youtube", social: "youtube", name: (runner.social as any) });

                const p = {
                    id: id,
                    name: runner.name,
                    pronouns: runner.pronouns || "",
                    socials: socials
                }
                peopleBank.value[id] = p;
                person = [id, p];

                if (!people.value.all.people.includes(id)) {
                    people.value.all.people.push(id);
                }
            }

            if (person) {
                allRunners.push(person);
                teamPeople.push(person);
            } else {
                nodecg.log.error(`Person not found or created for runner ${runner.name} (${runner.id})`);
            }
        }

        if (run.teams.length > 1) {
            const tid = `team${i + 1}`;
            people.value[tid] = {
                "name": team.name ?? `Team ${i + 1}`,
                "icon": klona(people.value.runners?.icon),
                "people": teamPeople.map(([k, p]) => k)
            }
        }
    });

    people.value.runners.people = allRunners.map(([k, p]) => k);
});
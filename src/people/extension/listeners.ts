import { getNodeCG } from '../../common/utils';
import { config } from '../../wasd/extension/replicants';
import { listenTo } from '../common/listeners';
import { people, peopleBank } from './replicants';

const nodecg = getNodeCG();

listenTo("setPerson", ({ id, person }) => {
    peopleBank.value[id] = person;
});


// Pull people from Oengus

async function loadOengusPeople() {
    try {
        const code = config.value.oengusShortcode;
        if (!code) return;
        const schList = await fetch(`https://oengus.io/api/v1/marathons/${code}/schedule`, { headers: { accept: "application/json" } });
        if (schList.status == 404) return nodecg.log.error("Marathon code", code, "does not exist");
        const lines = await schList.json();
        nodecg.log.info("Loaded schedule JSON");

        let updatedRunners = 0;
        let newRunners = 0;
        lines.lines.map((line: any) => {
            line.runners.map((p: any) => {
                if (p.displayName) {
                    const newP = {
                        name: p.displayName,
                        pronouns: p.pronouns?.length > 0 ? p.pronouns[0] : "",
                        socials: p.connections.map((c: any) => ({ id: c.id.toString(), social: c.platform.toLowerCase(), name: c.username }))
                    }
                    const id = p.id.toString();
                    updatedRunners++;
                    peopleBank.value[id] = newP;
                    if (!people.value.all.people.includes(id)) {
                        people.value.all.people.push(id);
                        newRunners++;
                    }
                }
            })
        });
        nodecg.log.info("Loading runners complete.", updatedRunners, "runners updated, of which", newRunners, "were created")
    } catch (e) {
        nodecg.log.error(e);
    }
}

// Since speedcontrol doesn't expose the marathon code nicely
nodecg.listenFor("importOengusSchedule", "nodecg-speedcontrol", async (data, ack) => {
    config.value.oengusShortcode = data.marathonShort;
    loadOengusPeople();
});

listenTo("loadRunners", ({ code }) => {
    if (code) {
        config.value.oengusShortcode = code;
        loadOengusPeople();
    }
});

// Update runners category with speedcontrol

nodecg.listenFor("changeToNextRun", "nodecg-speedcontrol", async (data, ack) => {
    // Update runners category
    // or do this in control panel? - probably?
});

nodecg.listenFor("changeActiveRun", "nodecg-speedcontrol", async (data, ack) => {
    // Also here
});
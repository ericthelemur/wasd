import { listenTo } from "../messages";
import { getNodeCG, getSpeedControlUtil, Replicant } from "../../common/utils";
import { DiscordCommPoint } from "./discord";
import { GuildScheduledEventCreateOptions, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, GuildScheduledEventStatus } from "discord.js";
import { Config, StreamState } from "types/schemas/wasd";

const nodecg = getNodeCG();
const sc = getSpeedControlUtil();

export const discord = new DiscordCommPoint();

const formats = [
    "Up Next: **%game%** (%category%) by %players%!",
    "**%game%** %category% by %players% coming up next!",
    "%players% is about to run **%game%** (%category%)!",
    "Get ready for %players% on **%game%** (%category%)!",
];

// Post message on event start
sc.runDataActiveRun.on("change", async (newVal) => {
    if (!newVal || !newVal.category || newVal.category == "Setup") return;
    const login = discord.replicants.login.value;
    const status = discord.replicants.status.value;
    if (!login.scheduleChannel || !status.postSchedule || !(await discord.isConnected())) return;

    const eventStatuses = discord.replicants.eventStatuses.value;
    let runStatus = eventStatuses[newVal.id] || { name: newVal.game || "" };

    if (!runStatus.messageID) {     // If no message yet sent, send message with random format
        discord.log.info("Posting run message for", newVal);
        let message = formats[Math.floor(Math.random() * formats.length)]
            .replace("%game%", newVal.game || "")
            .replace("%category%", newVal.category || "")
            .replace("%players%", newVal.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. "));

        if (runStatus.eventID) {
            const event = (await discord.getGuild())?.scheduledEvents.cache.get(runStatus.eventID);
            if (event && (event.isScheduled() || event.isActive())) {
                message += "\n" + event.url;
            }
        }
        const msg = await discord.sendMessage(message, login.scheduleChannel);
        if (msg) runStatus.messageID = msg.id;
    }

    if (!eventStatuses[newVal.id]) eventStatuses[newVal.id] = runStatus;
})

// Full resync of discord events
export const streamState = Replicant<StreamState>("streamState", "wasd");
listenTo("updateEvents", async () => {
    if (!(await discord.isConnected())) return;

    const eventStatuses = discord.replicants.eventStatuses.value;

    for (let run of sc.getRunDataArray().slice(0, 3)) {
        if (!run.category || run.category == "Setup") return;
        try {
            const runStatus = eventStatuses[run.id];
            const players = run.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. ");
            // Calculate adjusted time TODO: read off rundata - if active, make
            let baseTime = 1000 * (run.scheduledS || 0) - 1000 * 60 * (streamState.value.minsBehind || 0);

            const currentRun = sc.getCurrentRun();
            const isActiveRun = currentRun && run.id == currentRun.id;
            const now = Date.now();
            if (baseTime < now + 5000) {    // Check if starting in past or now - discord events cannot be scheduled for the past
                if (isActiveRun) baseTime = now + 5000;     // If active, skip into future to ensure creation
                else {  // If not active, skip as old
                    discord.log.info("Event scheduled for past, not creating");
                    continue;
                }
            }

            const args: GuildScheduledEventCreateOptions = {
                name: run.game || "Game",
                description: `${run.category || ""}\n${players ? "with " : ""}${players}`,
                scheduledStartTime: baseTime,
                scheduledEndTime: baseTime + 1000 * (run.estimateS || 0),
                privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
                entityType: GuildScheduledEventEntityType.External,
                entityMetadata: { location: "https://twitch.tv/warwickspeedrun" }
            };

            if (runStatus && runStatus.eventID) await discord.modifyEvent(runStatus.eventID, args);
            else {
                const result = await discord.createEvent(args);
                if (result) {
                    if (runStatus) eventStatuses[run.id].eventID = result.id;
                    else eventStatuses[run.id] = { name: run.game || "", eventID: result.id };

                    // Start event if created when run is in progress
                    if (isActiveRun) {
                        discord.setEventStatus(result.id, GuildScheduledEventStatus.Active);
                    }
                }
            }
        } catch (e) {
            discord.log.error(`Error updating event for ${run.game}`, e);
        }
    }
});


// Start new event on change of run
sc.runDataActiveRun.on("change", async (newVal) => {
    if (!discord.replicants.status.value.startAndEndEvents) return;
    if (!newVal || !newVal.category || newVal.category == "Setup") return;
    if (!(await discord.isConnected())) return;

    const eventStatuses = discord.replicants.eventStatuses.value;
    let runStatus = eventStatuses[newVal.id] || {};

    if (runStatus.eventID) {     // If discord event recorded, start it
        discord.log.info("Starting event for", newVal.game, runStatus.eventID);
        await discord.setEventStatus(runStatus.eventID, GuildScheduledEventStatus.Active);
    }
})

// End previous event on change of run
sc.runDataActiveRun.on("change", async (newVal, oldVal) => {
    if (!discord.replicants.status.value.startAndEndEvents) return;
    if (!oldVal || !oldVal.category || oldVal.category == "Setup") return;
    if (!(await discord.isConnected())) return;

    const eventStatuses = discord.replicants.eventStatuses.value;
    let runStatus = eventStatuses[oldVal.id] || {};

    if (runStatus.eventID) {     // If discord event recorded, start it
        discord.log.info("Ending event for", oldVal.game, runStatus.eventID);
        await discord.setEventStatus(runStatus.eventID, GuildScheduledEventStatus.Completed);
    }
})
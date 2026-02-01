import { listenTo } from "../messages";
import { getNodeCG, getSpeedControlUtil } from "../../common/utils";
import { DiscordCommPoint } from "./discord";

const nodecg = getNodeCG();
const sc = getSpeedControlUtil();

export const discord = new DiscordCommPoint();

listenTo("connected", async () => {
    const login = discord.replicants.login.value;
    if (login.donationChannel && await discord.isConnected()) {
        discord.sendMessage("Test Message", login.donationChannel);
    }
})

const formats = [
    "Up Next: **%game%** (%category%) by %players%!",
    "**%game%** %category% by %players% coming up next!",
    "%players% is about to run **%game%** (%category%)!",
    "Get ready for %players% on **%game%** (%category%)!",
];

sc.runDataActiveRun.on("change", async (newVal) => {
    if (!newVal || newVal.category == "Setup") return;
    const login = discord.replicants.login.value;
    const status = discord.replicants.status.value;
    if (!login.scheduleChannel || !status.postSchedule || !(await discord.isConnected())) return;

    const eventStatuses = discord.replicants.eventStatuses.value;
    let runStatus = eventStatuses[newVal.id] || {};

    if (!runStatus.messageID) {     // If no message yet sent, send message with random format
        const message = formats[Math.floor(Math.random() * formats.length)]
            .replace("%game%", newVal.game || "")
            .replace("%category%", newVal.category || "")
            .replace("%players%", newVal.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. "));

        const msg = await discord.sendMessage(message, login.scheduleChannel);
        if (msg) runStatus.messageID = msg.id;
    }

    if (!eventStatuses[newVal.id]) eventStatuses[newVal.id] = runStatus;
})

listenTo("updateEvents", async () => {
    const login = discord.replicants.login.value;
    const status = discord.replicants.status.value;
    if (!(await discord.isConnected())) return;

    const eventStatuses = discord.replicants.eventStatuses.value;

    for (let event of sc.getRunDataArray()) {
        try {
            // TODO
        } catch (e) {
            discord.log.error(`Error updating event for ${event.game}`);
        }
    }
})
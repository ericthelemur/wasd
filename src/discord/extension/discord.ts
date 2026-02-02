import { REST, Routes, Client, Events, GatewayIntentBits, TextChannel, GuildScheduledEventManager, GuildScheduledEventCreateOptions, GuildScheduledEventStatus, MessagePayload, MessageCreateOptions } from 'discord.js';

import { Login, EventStatuses, Status } from 'types/schemas/discord';
import { CommPoint } from '../../common/commpoint/commpoint';
import { AllUndef, NoUndef } from '../../common/utils';
import listeners, { ListenerTypes, listenTo } from '../messages';

const replicants = {
    status: undefined as undefined | Status,
    login: undefined as undefined | Login,

    eventStatuses: undefined as undefined | EventStatuses,
}

export type Replicants = NoUndef<typeof replicants>;
const replicantNamesOnly = replicants as AllUndef<typeof replicants>;

export class DiscordCommPoint extends CommPoint<ListenerTypes, Replicants> {
    client: Client | undefined;
    rest: REST | undefined;

    constructor() {
        super("discord", replicantNamesOnly, listeners);
    }

    /**
     * Sets up the constant connection to foobar2000
     */
    override async _connect() {
        const login = this.replicants.login.value;

        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
        this.rest = new REST({ version: '10' }).setToken(login.token);

        // Setup promise to wait for login to finish login
        let onLogin: (v: any) => any;
        const loggedInPromise = new Promise((resolve, reject) => { this.log.info("Logged in"); onLogin = resolve });
        this.client.on(Events.ClientReady, readyClient => onLogin(readyClient));

        this.client.on(Events.ShardError, (e) => this.log.warn("Connection error", e));

        // Call login and wait for logged in/ready event
        await this.client.login(login.token);
        await loggedInPromise;
    }

    override async _setupListeners() {
        const login = this.replicants.login.value;

        const commands = [
            { name: 'ping', description: 'Replies with Pong!' }
        ];

        // Register commands
        try {
            await this.rest?.put(Routes.applicationCommands(login.appID), { body: commands });
        } catch (e) {
            this.log.error("Error updating commands", e);
        }

        // Respond to commands
        this.client?.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;

            if (interaction.commandName === 'ping') await interaction.reply('Pong!');
        });
    }


    override async _disconnect() {
        if (this.client) await this.client.destroy();
        this.client = undefined;
        this.rest = undefined;
    }

    override async isConnected() {
        return this.replicants.status.value.connected == "connected" && Boolean(this.client?.isReady()) && Boolean(this.rest);
    }


    async getGuild() {
        if (!(await this.isConnected())) return;
        const guildID = this.replicants.login.value.server;
        if (!guildID) return;
        const guild = this.client?.guilds.cache.get(guildID);
        if (!guild) return;
        return guild;
    }

    async sendMessage(content: string | MessagePayload | MessageCreateOptions, channelID: string) {
        if (!(await this.isConnected())) return;

        const channel = this.client?.channels.cache.get(channelID);
        if (!channel) {
            this.log.error(`Discord channel ${channelID} does not exist or is inaccessible`);
            return;
        }
        if (!channel.isSendable()) {
            this.log.error(`Unable to post in Discord channel ${channelID} (${channel.name})`);
            return;
        }

        try {
            return await channel.send(content);
        } catch (e) {
            this.log.error(`Error sending Discord message to ${channelID}`, e);
            return;
        }
    }


    async createEvent(args: GuildScheduledEventCreateOptions) {
        const guild = await this.getGuild();
        if (!guild) return;
        const eventManager = guild.scheduledEvents;

        try {
            this.log.info("Creating event", args.name);
            const event = await eventManager.create(args);
            return event;
        } catch (e) {
            this.log.error(`Error creating event ${args.name}`, e);
        }
    }

    async modifyEvent(existingEventID: string, args: GuildScheduledEventCreateOptions) {
        const guild = await this.getGuild();
        if (!guild) return;
        const eventManager = guild.scheduledEvents;

        const existing = eventManager.cache.get(existingEventID);
        this.log.info("Existing event", existing);

        if (!existing) return await this.createEvent(args);
        // If no change in important fields, don't change
        if (args.name == existing.name
            && args.description == existing.description
            && args.scheduledStartTime == existing.scheduledStartTimestamp
            && args.scheduledEndTime == existing.scheduledEndTimestamp) {
            this.log.warn("No change to event, not updating");
            return;
        }

        // If over, it's gone, don't update
        if (existing.isCanceled() || existing.isCompleted()) {
            this.log.warn("Event already over, not updating");
            return;
        }

        // If started, don't update start time
        if (!existing.isScheduled() && args.scheduledStartTime && existing.scheduledStartTimestamp) {
            args.scheduledStartTime = existing.scheduledStartTimestamp;
        }

        this.log.info("Updating", existing.name);
        await eventManager.edit(existingEventID, args).catch(e => this.log.error(`Error creating event ${args.name}`, e));
    }

    async setEventStatus(existingEventID: string, status: GuildScheduledEventStatus.Active | GuildScheduledEventStatus.Completed | GuildScheduledEventStatus.Canceled) {
        const guild = await this.getGuild();
        if (!guild) return;
        const eventManager = guild.scheduledEvents;
        const existing = eventManager.cache.get(existingEventID);
        if (!existing) {    // Check event exists
            this.log.error("Cannot start event, event doesn't exist", existingEventID);
            return;
        }

        // Don't start an already started event (or cancelled or compeleted)
        if (status == GuildScheduledEventStatus.Active && existing.status != GuildScheduledEventStatus.Scheduled) {
            this.log.error("Cannot start event, event isn't scheduled", existingEventID);
            return;
        }

        // Don't end an already finished event
        if (status == GuildScheduledEventStatus.Completed && existing.status != GuildScheduledEventStatus.Active) {
            this.log.error("Cannot start event, event isn't scheduled", existingEventID);
            return;
        }
        existing.setStatus(status)
            .then(e => this.log.info("Started event", existingEventID))
            .catch(e => this.log.error("Error starting event", e));
    }
}

import { CLOSED, createEventSource, EventSourceClient, OPEN } from 'eventsource-client';
import { Login, MusicData, Status } from 'types/schemas/music';
import { CommPoint } from '../../common/commpoint/commpoint';
import { AllUndef, NoUndef } from '../../common/utils';
import listeners, { ListenerTypes, listenTo } from '../messages';
import { Foobar2000 } from './foobar2000';

const replicants = {
    status: undefined as undefined | Status,
    login: undefined as undefined | Login,

    musicData: undefined as undefined | MusicData,
}

export type Replicants = NoUndef<typeof replicants>;
const replicantNamesOnly = replicants as AllUndef<typeof replicants>;

export class FoobarCommPoint extends CommPoint<ListenerTypes, Replicants> {

    private auth: string | undefined;
    private headers: HeadersInit | undefined;

    source: EventSourceClient | undefined;

    // private positionTimestamp = 0;
    // private positionInitial = 0;
    // private positionInterval: NodeJS.Timeout | undefined;

    constructor() {
        super("music", replicantNamesOnly, listeners);
    }

    /**
     * Sets up the constant connection to foobar2000
     */
    override async _connect() {
        const login = this.replicants.login.value;
        this.auth = (login.username && login.password) ? `Basic ${Buffer.from(`${login.username}:${login.password}`).toString('base64')}` : undefined;
        this.headers = this.auth ? { Authorization: this.auth } : undefined;

        this.source = createEventSource({
            url: `http://${this.replicants.login.value.address}/api/query/updates?player=true&trcolumns=%artist%,%title%`,
            headers: this.headers,
            onMessage: ({ data }) => {  // Process message
                try {
                    this.log.info(data);
                    const json = JSON.parse(data);
                    this.processUpdate(json);
                } catch (err) {
                    this.log.error("Error parsing message", err);
                    this.log.debug(data);
                }
            },
            onDisconnect: () => {
                this.disconnect();
            },

        });

        // Listen to OBS transitions to play/pause correctly.
        // this.obs.conn.on('TransitionBegin', (data) => {
        //     if (data['to-scene']) {
        //         if (data['to-scene'].includes('[M]')) {
        //             this.play();
        //         } else {
        //             this.pause();
        //         }
        //     }
        // });
    }

    override async _setupListeners() {
        listenTo("play", () => this.play());
        listenTo("pause", () => this.pause());
        listenTo("skip", () => this.skip());
    }


    override async _disconnect() {
        // clearInterval(this.positionInterval);
        if (this.source && this.source?.readyState != CLOSED) this.source.close();
        this.source = undefined;
        this.auth = undefined;
        this.headers = undefined;
    }

    override async isConnected() {
        return this.replicants.status.value.connected === "connected" && Boolean(this.source) && this.source?.readyState == OPEN;
    }


    /**
     * Make a request to the Beefweb foobar2000 plugin.
     * @param method Required HTTP method.
     * @param endpoint The endpoint to request.
     */
    private async request(method: string, endpoint: string): Promise<Response> {
        this.log.debug(`Fetching ${endpoint}`);
        const resp = await fetch(`http://${this.replicants.login.value.address}/api${endpoint}`, { method, headers: this.headers });
        if (resp.status != 200 && resp.status != 204) {
            const text = await resp.text();
            this.nodecg.log.debug(`Error fetching ${endpoint}:`, text);
        }
        this.nodecg.log.debug(`Request to ${endpoint} successful`);
        return resp;
    }

    /**
     * Updates the stored position of the current track every second.
     */
    // private updatePosition(): void {
    //     const musicData = this.replicants.musicData.value;
    //     if (musicData.track && musicData.playing) {
    //         // Update position a second further
    //         // Relative to foobar response at positionTimestamp containing time positionInitial
    //         const timeSinceLast = Date.now() - this.positionTimestamp;
    //         musicData.track.position = timeSinceLast / 1000 + this.positionInitial;
    //     } else if (this.positionInterval) {
    //         clearInterval(this.positionInterval);
    //     }
    // }

    async play() {
        if (!await this.isConnected()) return;
        try {
            await this.request('post', '/player/play');
            this.log.info('Successfully playing');
        } catch (e) {
            this.log.error('Error playing', e);
        }
    }

    async pause() {
        if (!await this.isConnected()) return;
        try {
            await this.request('post', '/player/pause');
            this.log.info('Successfully paused');
        } catch (e) {
            this.log.error('Error pausing', e);
        }
    }

    async skip() {
        if (!await this.isConnected()) return;
        try {
            await this.request('post', '/player/next');
            this.log.info('Successfully skipped');
        } catch (e) {
            this.log.error('Error skipping', e);
        }
    }


    /*
        Process response from foobar update poll
    */
    private async processUpdate(msg: Foobar2000.UpdateMsg) {
        if (msg.player) {
            // if (this.positionInterval) clearInterval(this.positionInterval);    // Refresh live position updating

            const musicData = this.replicants.musicData.value;
            const status = this.replicants.status.value;
            status.playing = msg.player.playbackState === 'playing';  // Mark as playing

            if (msg.player.playbackState !== 'stopped') {   // If playing/paused
                if (msg.player.activeItem.duration > 0) {

                    // If song is different, fetch album art
                    const newSong = msg.player.activeItem.columns[1] != musicData?.title;
                    let artwork = musicData?.artwork;
                    if (newSong) {  // If new song, fetch artwork
                        try {   // Fetch artwork and convert to base64 - currently hardcoded to png
                            const imgBytes = await this.request("get", "/artwork/current").then(r => r.bytes());
                            const imgStr = Buffer.from(imgBytes).toString("base64");
                            artwork = `data:image/png;base64,${imgStr}`;
                        } catch (e) {
                            this.nodecg.log.error("Error fetching artwork", e);
                            artwork = undefined;
                        }
                    }

                    // Update musicData with track info
                    this.replicants.musicData.value = {
                        artist: msg.player.activeItem.columns[0] || undefined,
                        title: msg.player.activeItem.columns[1] || undefined,
                        position: msg.player.activeItem.position,
                        duration: msg.player.activeItem.duration,
                        artwork: artwork
                    };

                    // Restart live position updating
                    // if (msg.player.playbackState === 'playing') {
                    //     this.positionInitial = msg.player.activeItem.position;
                    //     this.positionTimestamp = Date.now();
                    //     this.positionInterval = setInterval(() => this.updatePosition(), 1000);
                    // }
                }
            } else {    // If stopped, clear track
                this.replicants.musicData.value = null;
            }
        }
    }
}

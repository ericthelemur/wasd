import { createParser, EventSourceParser, type EventSourceMessage } from 'eventsource-parser'
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

    private decoder = new TextDecoder("UTF-8");
    private aborter = new AbortController();
    response: Response | undefined;
    parser: EventSourceParser;

    // private positionTimestamp = 0;
    // private positionInitial = 0;
    // private positionInterval: NodeJS.Timeout | undefined;

    constructor() {
        super("music", replicantNamesOnly, listeners);

        // Function upon receiving update from Foobar: parse response and call processUpdate to update replicant
        const onEvent = (event: EventSourceMessage) => {
            this.log.debug("Recieved SSE: ", event.data);
            if (event.data == "{}") return;

            // Parse event data into JSON
            let msg: Foobar2000.UpdateMsg | undefined;
            try {
                msg = JSON.parse(event.data);
            } catch (err) {
                this.log.error("Error parsing message on connection:", err, event.data);
            }

            if (msg) {
                this.processUpdate(msg);
            }
        }

        this.parser = createParser({ onEvent, onError: (e) => { this.log.error("Error in parser", e); this.disconnect() } });
    }

    /**
     * Sets up the constant connection to foobar2000
     */
    override async _connect() {
        const login = this.replicants.login.value;
        this.auth = (login.username && login.password) ? `Basic ${Buffer.from(`${login.username}:${login.password}`).toString('base64')}` : undefined;
        this.headers = this.auth ? { Authorization: this.auth } : undefined;

        const oldAborter = this.aborter; // If pre-existing AbortController, abort it to ensure never multiple streams
        const aborter = new AbortController();
        this.aborter = aborter;
        oldAborter.abort();

        // Make initial request (subscribe to server-side events)
        const resp = await this.request('get', '/query/updates?player=true&trcolumns=%artist%,%title%', { connection: "keep-alive", Accept: "text/event-stream" }, aborter);
        if (!resp.body) throw new Error('Empty Response ' + String(resp));

        (async () => {  // Almost certainly a more sensible way to dispatch this to async, but anyway
            try {       // Read each server-side event from response, and feed into parser
                for await (const chunk of resp.body as any) {
                    this.parser.feed(this.decoder.decode(chunk, { stream: true }));
                }
                this.log.error(`End of Foobar responses`);
                this.reconnect();   // End of SSE response, reconnect
            } catch (e) {
                if (!(e instanceof DOMException)) { // Aborted request throws DOMException, ignore it
                    this.log.error("Error parsing response", e);
                }
                this.reconnect();
            }
        })();

        this.response = resp;
    }

    override async _setupListeners() {
        listenTo("play", () => this.play());
        listenTo("pause", () => this.pause());
        listenTo("skip", () => this.skip());
    }


    override async _disconnect() {
        // clearInterval(this.positionInterval);
        // if (this.response) this.response.can;
        this.response = undefined;
        if (this.aborter) this.aborter.abort();
        if (this.parser) this.parser.reset();

        this.auth = undefined;
        this.headers = undefined;
    }

    override async isConnected() {
        // this.log.info(this.replicants.status.value.connected, !this.aborter.signal.aborted);
        return this.replicants.status.value.connected === "connected" && !this.aborter.signal.aborted;
    }


    /**
     * Make a request to the Beefweb foobar2000 plugin.
     * @param method Required HTTP method.
     * @param endpoint The endpoint to request.
     */
    private async request(method: string, endpoint: string, extraHeaders?: HeadersInit, aborter?: AbortController): Promise<Response> {
        this.log.debug(`Fetching ${endpoint}`);
        const resp = await fetch(`http://${this.replicants.login.value.address}/api${endpoint}`, { method, headers: { ...this.headers, ...extraHeaders }, signal: aborter?.signal });
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
        this.log.info("Attempting play")
        if (!(await this.isConnected())) return;
        this.log.info("Connected for play")
        try {
            await this.request('post', '/player/play');
            this.log.info('Successfully playing');
        } catch (e) {
            this.log.error('Error playing', e);
        }
    }

    async pause() {
        if (!(await this.isConnected())) return;
        try {
            await this.request('post', '/player/pause');
            this.log.info('Successfully paused');
        } catch (e) {
            this.log.error('Error pausing', e);
        }
    }

    async skip() {
        if (!(await this.isConnected())) return;
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

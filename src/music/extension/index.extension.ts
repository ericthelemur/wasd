import type NodeCGTypes from '@nodecg/types';
import { Readable } from 'stream';
import { MusicData } from 'types/schemas/music';
import { BundleReplicant, getNodeCG } from '../../common/utils';
import { Foobar2000 } from './Foobar2000';
import { listenTo } from '../messages';
import { read } from 'fs';

export class Music {
    private nodecg: NodeCGTypes.ServerAPI;
    private config: Foobar2000.Config;
    private auth: string | undefined;
    private headers: HeadersInit | undefined;
    private positionTimestamp = 0;
    private positionInitial = 0;
    private positionInterval: NodeJS.Timeout | undefined;
    musicData: NodeCGTypes.ServerReplicantWithSchemaDefault<MusicData>;

    private decoder = new TextDecoder("UTF-8");

    constructor(nodecg: NodeCGTypes.ServerAPI, config: Foobar2000.Config) {
        this.nodecg = nodecg;
        this.config = config;
        this.auth = (config.username && config.password)
            ? `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`
            : undefined;
        this.headers = this.auth ? { Authorization: this.auth } : undefined;
        this.musicData = BundleReplicant<MusicData>("musicData", "music");

        this.musicData.value.connected = false;
        if (config.enabled) {
            this.setup();
        }
    }

    /**
     * Make a request to the Beefweb foobar2000 plugin.
     * @param method Required HTTP method.
     * @param endpoint The endpoint to request.
     */
    private async request(method: string, endpoint: string): Promise<Response> {
        this.nodecg.log.debug(`[Music] API ${method.toUpperCase()} request processing on ${endpoint}`);
        const resp = await fetch(`http://${this.config.address}/api${endpoint}`, {
            method,
            headers: this.headers,
        });
        if (![200, 204].includes(resp.status)) {
            const text = await resp.text();
            this.nodecg.log
                .debug(`[Music] API ${method.toUpperCase()} request error on ${endpoint}:`, text);
            throw new Error(text);
        }
        this.nodecg.log.debug(`[Music] API ${method.toUpperCase()} request successful on ${endpoint}`);
        return resp;
    }

    /**
     * Updates the stored position of the current track every second.
     */
    private updatePosition(): void {
        if (this.musicData.value.track && this.musicData.value.playing) {
            this.musicData.value.track.position = ((Date.now() - this.positionTimestamp) / 1000)
                + this.positionInitial;
        } else if (this.positionInterval) {
            clearInterval(this.positionInterval);
        }
    }

    /**
     * Sends a "play" command to foobar2000.
     */
    async play(): Promise<void> {
        if (!this.config.enabled) return;
        try {
            await this.request('post', '/player/play');
            this.nodecg.log.info('[Music] Successfully playing');
        } catch (err) {
            this.nodecg.log.warn('[Music] Error playing');
            this.nodecg.log.debug('[Music] Error playing:', err);
        }
    }

    /**
     * Sends a "pause" command to foobar2000.
     */
    async pause(): Promise<void> {
        if (!this.config.enabled) return;
        try {
            await this.request('post', '/player/pause');
            this.nodecg.log.info('[Music] Successfully paused');
        } catch (err) {
            this.nodecg.log.warn('[Music] Error pausing');
            this.nodecg.log.debug('[Music] Error pausing:', err);
        }
    }

    private async processUpdate(msg: Foobar2000.UpdateMsg) {
        if (msg.player) {
            if (this.positionInterval) clearInterval(this.positionInterval);
            this.musicData.value.playing = msg.player.playbackState === 'playing';
            if (msg.player.playbackState !== 'stopped') {
                if (msg.player.activeItem.duration > 0) {
                    const newSong = msg.player.activeItem.columns[1] != this.musicData.value.track?.title;
                    let artwork = this.musicData.value.track?.artwork;
                    if (newSong) {  // If new song, fetch artwork
                        try {
                            const imgBytes = await this.request("get", "/artwork/current").then(r => r.bytes());
                            const imgStr = Buffer.from(imgBytes).toString("base64");
                            artwork = `data:image/png;base64,${imgStr}`;
                        } catch (e) {
                            this.nodecg.log.error("Error fetching artwork", e);
                            artwork = undefined;
                        }
                    }
                    this.musicData.value.track = {
                        artist: msg.player.activeItem.columns[0] || undefined,
                        title: msg.player.activeItem.columns[1] || undefined,
                        position: msg.player.activeItem.position,
                        duration: msg.player.activeItem.duration,
                        artwork: artwork
                    };

                    if (msg.player.playbackState === 'playing') {
                        this.positionInitial = msg.player.activeItem.position;
                        this.positionTimestamp = Date.now();
                        this.positionInterval = setInterval(() => this.updatePosition(), 1000);
                    }
                }
            } else {
                delete this.musicData.value.track;
            }
        }
    }

    /**
     * Sets up the constant connection to foobar2000.
     */
    private async setup(): Promise<void> {
        try {
            this.nodecg.log.info('[Music] Attempting connection');
            const resp = await this.request('get', '/query/updates?player=true&trcolumns=%artist%,%title%');
            this.musicData.value.connected = true;
            this.nodecg.log.info('[Music] Connection successful');
            if (!resp.body) throw new Error('body was null');
            const reader = resp.body.getReader();

            const that = this;
            reader.read().then(function pump(result): Promise<void> | undefined {
                if (result.done) {  // If connection closed, start retry
                    that.musicData.value.connected = false;
                    that.nodecg.log.warn('[Music] Connection ended, retrying in 5 seconds');
                    setTimeout(() => that.setup(), 5 * 1000);
                    return;
                };

                // Decode JSON
                let msg: Foobar2000.UpdateMsg | undefined;
                try {
                    const text = that.decoder.decode(result.value, { stream: true }).slice(6).replace(/(\r\n|\n|\r)/gm, '');
                    that.nodecg.log.info(text);
                    msg = JSON.parse(text);
                } catch (err) {
                    that.nodecg.log.warn('[Music] Error parsing message on connection');
                    that.nodecg.log.debug('[Music] Error parsing message on connection:', err);
                }

                // Call process update
                if (msg) {
                    that.processUpdate(msg);
                }

                // Continue processing chunks
                return reader.read().then(pump);
            }).catch(err => {
                this.nodecg.log.warn('[Music] Connection error');
                this.nodecg.log.debug('[Music] Connection error:', err);
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
        } catch (err) {
            this.musicData.value.connected = false;
            this.nodecg.log.warn('[Music] Connection failed, retrying in 5 seconds');
            this.nodecg.log.debug('[Music] Connection failed, retrying in 5 seconds:', err);
            setTimeout(() => this.setup(), 5 * 1000);
        }
    }
}

export const music = new Music(getNodeCG(), {
    "address": "127.0.0.1:8880",
    "enabled": true,
    "username": "wasd",
    "password": "A2kLG5aZrJP#um"
})

listenTo("play", () => music.play());
listenTo("pause", () => music.pause());
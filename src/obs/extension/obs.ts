import fsPromises from 'fs/promises';
import getCurrentLine from 'get-current-line';
import OBSWebSocket, { OBSRequestTypes } from 'obs-websocket-js';
import path from 'path';
import {
    Namespaces, ObsLogin, ObsScene, ObsSource, ObsStatus, PreviewScene, ProgramScene, SceneList
} from 'types/schemas/obs';

import NodeCG from '@nodecg/types';

import { getSpeedControlUtil, PrefixedReplicant, Replicant } from '../../common/utils';
import { ListenerTypes, listenTo, sendTo } from '../messages';

type PreTransitionProps = ListenerTypes["transition"];
export interface Hooks {
    preTransition(obs: OBSUtility, opts: PreTransitionProps):
        PreTransitionProps | void | Promise<PreTransitionProps> | Promise<void>
}

const usedNamespaces = new Set();


function getFilename() {
    const run = getSpeedControlUtil().runDataActiveRun.value;
    if (!run) return "Unknown";
    const runners = run.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. ");

    const times = getSpeedControlUtil().runFinishTimes.value;
    const time = times ? times[run?.id] : undefined;

    return [
        run.game,
        run.category ? " - " : "",
        run.category,
        " - ",
        runners,
        time ? " in " : "",
        time?.time,
        " (WASD 2025)"
    ].join("");
}


export class OBSUtility extends OBSWebSocket {
    nodecg: NodeCG.ServerAPI;
    namespace: string;
    hooks: Partial<Hooks>;
    replicants: {
        login: NodeCG.ServerReplicantWithSchemaDefault<ObsLogin>;
        programScene: NodeCG.ServerReplicantWithSchemaDefault<ProgramScene>;
        previewScene: NodeCG.ServerReplicantWithSchemaDefault<PreviewScene>;
        sceneList: NodeCG.ServerReplicantWithSchemaDefault<SceneList>;
        obsStatus: NodeCG.ServerReplicantWithSchemaDefault<ObsStatus>;
    };
    log: NodeCG.Logger;

    private _ignoreConnectionClosedEvents = false;
    private _reconnectInterval: NodeJS.Timeout | null = null;

    private _lastTransitioningTarget: string | undefined = undefined;
    private _lastTransitioningTime: number = 0;
    private _transitioningBackupTimeout: NodeJS.Timeout | null = null;

    constructor(nodecg: NodeCG.ServerAPI, opts: { namespace?: string; hooks?: Partial<Hooks> } = {}) {
        super();
        this.nodecg = nodecg;
        let namespace = opts.namespace || '';

        if (usedNamespaces.has(namespace)) {
            throw new Error(`Namespace "${namespace}" has already been used. Please choose a different namespace.`);
        }

        usedNamespaces.add(namespace);
        this.namespace = namespace;
        const namespacesReplicant = Replicant<Namespaces>("namespaces", "obs", { persistent: false });
        namespacesReplicant.value.push(namespace);

        this.replicants = {
            login: PrefixedReplicant<ObsLogin>(namespace, "obsLogin", "obs"),
            programScene: PrefixedReplicant<ProgramScene>(namespace, "programScene", "obs", { persistent: false }),
            previewScene: PrefixedReplicant<PreviewScene>(namespace, "previewScene", "obs", { persistent: false }),
            sceneList: PrefixedReplicant<SceneList>(namespace, "sceneList", "obs", { persistent: false }),
            obsStatus: PrefixedReplicant<ObsStatus>(namespace, "obsStatus", "obs")
        };
        this.log = new nodecg.Logger(namespace ? "obs:" + namespace : "obs");
        this.hooks = opts.hooks || {};

        this._connectionListeners();
        this._replicantListeners();
        this._transitionListeners();
        this._interactionListeners();
    }


    private _connectionListeners() {
        this.replicants.obsStatus.once('change', newVal => {
            // If we were connected last time, try connecting again now.
            if (newVal && (newVal.connection === 'connected' || newVal.connection === 'connecting')) {
                this.replicants.obsStatus.value.connection = 'connecting';
                this._connectToOBS().then().catch(() => {
                    this.replicants.obsStatus.value.connection = 'error';
                });
            }
        });

        this.nodecg.listenFor("DEBUG:callOBS", async (data, ack) => {
            if (!data.name || !data.args) return this.ackError(ack, "No name or args", undefined);
            this.log.info("Called", data.name, "with", data.args);
            try {
                const res = await this.call(data.name, data.args);
                if (ack && !ack.handled) ack(undefined, res);
                this.log.info("Result:", res);
            } catch (err) {
                this.ackError(ack, `Error calling ${data.name}`, err);
            }
        })

        listenTo("obsConnect", (params, ack) => {
            this._ignoreConnectionClosedEvents = false;
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;

            this.replicants.login.value = { ...this.replicants.login.value, ...params };

            this._connectToOBS().then(() => {
                if (ack && !ack.handled) ack();
            }).catch(err => {
                this.replicants.obsStatus.value.connection = 'error';
                this.ackError(ack, `Failed to connect`, err);
            });
        }, this.namespace);

        listenTo("obsDisconnect", (_, ack) => {
            this._ignoreConnectionClosedEvents = true;
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;

            this.replicants.obsStatus.value.connection = 'disconnected';
            this.disconnect();
            this.log.info('Operator-requested disconnect.');

            if (ack && !ack.handled) ack();
        }, this.namespace);

        this.on("ConnectionClosed", this._reconnectToOBS);

        (this as any).on("error", (e: Error) => {
            this.ackError(undefined, "", e);
            this._reconnectToOBS();
        });

        setInterval(() => {
            if (this.replicants.obsStatus.value.connection === 'connected' && this.socket?.readyState !== this.socket?.OPEN) {
                this.log.warn('Thought we were connected, but the automatic poll detected we were not. Correcting.');
                clearInterval(this._reconnectInterval!);
                this._reconnectInterval = null;
                this._reconnectToOBS();
            }
        }, 5000);
    }


    private _connectToOBS() {
        const login = this.replicants.login.value;
        const status = this.replicants.obsStatus.value;
        if (status.connection === 'connected') {
            throw new Error('Attempted to connect to OBS while already connected!');
        }

        status.connection = 'connecting';

        return this.connect(login.ip, login.password).then(() => {
            this.log.info('Connected');
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;
            status.connection = 'connected';
            // this.call("SetStudioModeEnabled", { studioModeEnabled: true });
            return this._fullUpdate();
        });
    }

    private _reconnectToOBS() {
        if (this._reconnectInterval) return;

        const status = this.replicants.obsStatus.value;
        if (this._ignoreConnectionClosedEvents) {
            status.connection = 'disconnected';
            return;
        }

        status.connection = 'connecting';
        this.log.warn('Connection closed, will attempt to reconnect every 5 seconds.');
        // Retry, ignoring errors
        this._reconnectInterval = setInterval(() => this._connectToOBS().catch(() => { }), 5000);
    }


    private _replicantListeners() {
        this.on("SceneListChanged", ({ scenes }) => this._updateSceneList(scenes as { sceneName: string }[]));
        this.on("SceneItemCreated", ({ sceneName }) => this._updateSceneItems(this.replicants.sceneList, sceneName, sceneName));
        this.on("SceneItemRemoved", ({ sceneName }) => this._updateSceneItems(this.replicants.sceneList, sceneName, sceneName));
        this.on("SceneItemTransformChanged", ({ sceneName }) => this._updateSceneItems(this.replicants.sceneList, sceneName, sceneName));

        this.on("CurrentPreviewSceneChanged", ({ sceneName }) => this._updateSceneItems(this.replicants.previewScene, sceneName));
        this.on("CurrentProgramSceneChanged", ({ sceneName }) => this._updateSceneItems(this.replicants.programScene, sceneName));


        // Clear or set preview on studio mode set or unset
        this.on("StudioModeStateChanged", ({ studioModeEnabled }) => {
            this.replicants.obsStatus.value.studioMode = studioModeEnabled;
            if (!studioModeEnabled) this.replicants.previewScene.value = null;
            else this._tryCallOBS("GetCurrentPreviewScene")
                .then(({ currentPreviewSceneName }) => this._updateSceneItems(this.replicants.previewScene, currentPreviewSceneName))
                .catch(err => this.ackError(undefined, 'Error fetching preview scene:', err));
        });

        this.on("RecordStateChanged", ({ outputActive }) => this.replicants.obsStatus.value.recording = outputActive);
        this.on("StreamStateChanged", ({ outputActive }) => this.replicants.obsStatus.value.streaming = outputActive);
    }

    private _fullUpdate() {
        this.replicants.obsStatus.value.transitioning = false;

        return Promise.all([
            this._updateScenes().then(
                (res) => Promise.all([
                    this._updateSceneItems(this.replicants.previewScene, res.currentPreviewSceneName),
                    this._updateSceneItems(this.replicants.programScene, res.currentProgramSceneName)
                ])
            ).catch(err => this.ackError(undefined, 'Error updating scenes list:', err)),
            this._updateStatus()
        ]).catch(err => this.ackError(undefined, 'Error in full update:', err));
    }

    private _updateScenes() {
        return this._tryCallOBS('GetSceneList').then(res => {
            // Response type is not detailed enough, so assert type here
            this._updateSceneList(res.scenes as { sceneName: string }[]);
            return res;
        });
    }

    private _updateSceneList(scenes: { sceneName: string }[]) {
        Promise.all(scenes.map(s => this._fetchSceneInfo(s.sceneName)))
            .then(r => this.replicants.sceneList.value = r)
            .catch((err) => this.ackError(undefined, "Error updating scene list", err));
        return scenes;
    }

    private _updateSceneItems(replicant: NodeCG.ServerReplicantWithSchemaDefault<PreviewScene | ObsScene[]>, sceneName: string, child?: string) {
        if (!sceneName) replicant.value = null;
        else {
            this._fetchSceneInfo(sceneName).then(v => {
                if (!child) replicant.value = v;
                else {  // If passed in list, overwrite child with data
                    let scene = (replicant.value as ObsScene[]).find(s => s.name == child);
                    if (scene) scene.sources = v.sources;
                    else (replicant.value as ObsScene[]).push(v);
                }
            })
                .catch(err => this.ackError(undefined, `Error updating ${replicant.name} scene:`, err));
        }
    }

    private _fetchSceneInfo(sceneName: string): Promise<ObsScene> {
        return this._tryCallOBS("GetSceneItemList", { sceneName: sceneName })
            .then(items => ({ name: sceneName, sources: items.sceneItems as unknown as ObsSource[] }))
    }


    private _updateStatus() {
        return Promise.all([
            this._tryCallOBS('GetStudioModeEnabled').then(({ studioModeEnabled }) => this.replicants.obsStatus.value.studioMode = studioModeEnabled),
            this._tryCallOBS('GetRecordStatus').then(({ outputActive }) => this.replicants.obsStatus.value.recording = outputActive),
            this._tryCallOBS('GetStreamStatus').then(({ outputActive }) => this.replicants.obsStatus.value.streaming = outputActive)
        ]);
    }


    private async _tryCallOBS<Type extends keyof OBSRequestTypes>(requestType: Type, requestData?: OBSRequestTypes[Type], ack?: NodeCG.Acknowledgement, errMsg?: string, catchF?: (e: any) => {}) {
        this.log.info("Calling", requestType, "with", requestData);
        if (this.replicants.obsStatus.value.connection != "connected") {
            if (catchF) catchF("OBS is not connected");
            this.ackError(ack, `Error calling ${requestType}: OBS is not connected`, null);
            throw new Error("OBS is not connected");
        }

        return this.call(requestType, requestData).then((res) => {
            if (ack && !ack.handled) ack();
            return res;
        }).catch((err) => {
            if (catchF) catchF(err);
            this.ackError(ack, errMsg ? errMsg : `Error calling ${requestType}`, err);
            throw err;
        });
    }

    private ackError(ack: NodeCG.Acknowledgement | undefined, errmsg: string, err: any) {
        const line = getCurrentLine({ frames: 2 });
        this.log.error(`[${line.file}:${line.line}:${line.char}]`, errmsg, err);
        if (ack && !ack.handled) ack(err);
    }

    private _transitionListeners() {
        listenTo("transition", async (args, ack) => {
            this.log.info("Transitioning to", args);
            try {
                args = args ? args : {};
                // Mark that we're starting to transition. Resets to false after SwitchScenes.
                this.replicants.obsStatus.value.transitioning = true;

                // Call hook
                if (this.hooks.preTransition !== undefined) {
                    const res = await this.hooks.preTransition(this, args);
                    if (res) args = res;
                }

                // Set transition and duration
                if (args.transitionName) this._tryCallOBS("SetCurrentSceneTransition",
                    { "transitionName": args.transitionName }, ack, "Error setting transition"
                );

                if (args.transitionDuration) this._tryCallOBS("SetCurrentSceneTransitionDuration",
                    { transitionDuration: args.transitionDuration }, ack, "Error setting transiton duration"
                );

                // Trigger transition, needs different calls outside studio mode
                if (this.replicants.obsStatus.value.studioMode) {
                    this._tryCallOBS('SetCurrentProgramScene', { 'sceneName': args.sceneName },
                        ack, 'Error setting preview scene for transition:')

                    // setTimeout(() => {
                    //     this._tryCallOBS("TriggerStudioModeTransition", undefined, ack, "Error transitioning",
                    //         (e) => this.replicants.obsStatus.value.transitioning = false);
                    // }, 500);
                } else {
                    if (!args.sceneName) {
                        this.ackError(ack, "Error: Cannot transition", undefined);
                        this.replicants.obsStatus.value.transitioning = false;
                    } else this._tryCallOBS("SetCurrentProgramScene", { 'sceneName': args.sceneName }, ack, "Error transitioning",
                        (e) => this.replicants.obsStatus.value.transitioning = false);
                }
            } catch (err) {
                this.ackError(undefined, 'Error transitioning:', err);
            }
        }, this.namespace);

        listenTo("preview", async (args, ack) => {
            if (!this.replicants.obsStatus.value.studioMode) this.ackError(ack, "Cannot preview when not in studio mode", undefined);

            this._tryCallOBS('SetCurrentPreviewScene', { 'sceneName': args.sceneName },
                ack, 'Error setting preview scene for transition:')
                .catch(err => this.ackError(undefined, 'Error changing preview scene:', err));
        }, this.namespace);

        this.replicants.programScene.on("change", (newVal, oldVal) => {
            this._sendTransitioning("", oldVal?.name, newVal?.name);
        })

        this.on("SceneTransitionStarted", ({ transitionName }) => {
            const pro = this.replicants.programScene.value;
            const from = pro?.name;

            this._tryCallOBS('GetCurrentProgramScene').then(({ currentProgramSceneName }) => {
                const to = currentProgramSceneName;

                // this.replicants.obsStatus.value.transitioning = true;
                this._sendTransitioning(transitionName, from, to);
            }).catch(err => this.ackError(undefined, 'Error sending transitioning:', err));
        })

        this.on("SceneTransitionEnded", () => this.replicants.obsStatus.value.transitioning = false);
        // SceneTransitionEnded doesn't trigger if user cancelled transition, so cya
        this.on("CurrentProgramSceneChanged", () => {
            if (this.replicants.obsStatus.value.transitioning) {
                this.replicants.obsStatus.value.transitioning = false;
            }
        })

        listenTo("transitioning", ({ toScene }) => {
            this._lastTransitioningTarget = toScene;
            this._lastTransitioningTime = Date.now();

            clearInterval(this._transitioningBackupTimeout ?? undefined);
            this._transitioningBackupTimeout = setTimeout(() => this.replicants.obsStatus.value.transitioning = false, 2000);
        });

    }

    private _sendTransitioning(name: string, from?: string, to?: string) {
        // Avoid triggering duplicate transitioning events
        const now = Date.now();
        if (to == this._lastTransitioningTarget && now - 60000 < this._lastTransitioningTime) return;

        this._lastTransitioningTarget = to;
        this._lastTransitioningTime = now;

        this.replicants.obsStatus.value.transitioning = true;
        sendTo("transitioning", {
            transitionName: name,
            fromScene: from,
            toScene: to
        });
    }

    private _interactionListeners() {
        listenTo("moveItem", ({ sceneName, sceneItemId, transform }, ack) => {
            if (this.replicants.obsStatus.value.moveCams) {
                this._tryCallOBS("SetSceneItemTransform", { sceneName: sceneName, sceneItemId: sceneItemId, sceneItemTransform: transform as any })
                    .catch(err => this.ackError(undefined, `Error moving ${sceneItemId} in ${sceneName}:`, err));
            }
        })

        // Recording Listeners
        listenTo("startRecording", (_, ack) => {
            if (!this.replicants.obsStatus.value.controlRecording) this.ackError(ack, "Error starting recording:", "Recording Control is disabled")
            else if (this.replicants.obsStatus.value.connection != "connected") this.ackError(ack, "Error starting recording:", "OBS is disconnected")
            else if (this.replicants.obsStatus.value.recording) this.ackError(ack, "Error starting recording:", "Recording is already in progress")
            else {
                this.log.info("Starting Recording");
                this._tryCallOBS("StartRecord", undefined, ack)
                    .catch(err => this.ackError(ack, "Error starting recording:", err));
            }
        });

        listenTo("stopRecording", (_, ack) => {
            if (!this.replicants.obsStatus.value.controlRecording) this.ackError(ack, "Error stopping recording:", "Recording Control is disabled")
            else if (this.replicants.obsStatus.value.connection != "connected") this.ackError(ack, "Error stopping recording:", "OBS is disconnected")
            else if (!this.replicants.obsStatus.value.recording) this.ackError(ack, "Error stopping recording:", "Recording is already stopped")
            else {
                this._tryCallOBS("StopRecord", undefined, ack).then(({ outputPath }) => {
                    // Rename OBS output to include run
                    const newFilename = getFilename();
                    const currPath = path.parse(outputPath);
                    const newName = `${currPath.name} ${newFilename.replace(/[\\/:*?"<>|]/g, " ")}${currPath.ext}`
                    currPath.base = newName;
                    const targetPath = path.format(currPath);
                    setTimeout(() => fsPromises.rename(outputPath, targetPath)
                        .then(() => this.log.info(`Renamed ${outputPath} to ${targetPath}`))
                        .catch((e) => this.log.error(`Error renaming ${outputPath} to ${targetPath}: ${e}`)), 5000);
                }).catch(err => this.ackError(undefined, 'Error stopping recording:', err));
            }
        });

        listenTo("refreshOBS", () => this._fullUpdate());
    }
}
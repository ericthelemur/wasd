import NodeCG from "@nodecg/types";
import fsPromises from "fs/promises";
import OBSWebSocket, { OBSRequestTypes } from "obs-websocket-js";
import path from "path";
import { Login, ObsScene, ObsSource, PreviewScene, ProgramScene, SceneList, Status } from "types/schemas/obs";
import { CommPoint } from "../../common/commpoint/commpoint";
import { BundleReplicant, getSpeedControlUtil, sendError, sendSuccess } from "../../common/utils";
import listeners, { ListenerTypes, listenTo, sendTo } from "../messages";

const replicants = {
    status: null as null | Status,
    login: null as null | Login,

    previewScene: null as null | PreviewScene,
    programScene: null as null | ProgramScene
}

export type Replicants = {
    status: Status,
    login: Login,

    previewScene: PreviewScene,
    programScene: ProgramScene,
    sceneList: SceneList
};

export class OBSCommPoint extends CommPoint<ListenerTypes, Replicants> {
    obs: OBSWebSocket = new OBSWebSocket();

    // Used to avoid accidental double transitions
    private _lastTransitioningTarget: string | undefined = undefined;
    private _lastTransitioningTime: number = 0;

    // Use to revert status.transitioning if no response
    private _transitioningHardEndTimeout: NodeJS.Timeout | null = null;

    constructor() {
        super("obs", {
            status: null,   // Initialize status & login with default replicant args
            login: null,
            programScene: BundleReplicant("programScene", "obs", { persistent: false }), // Make the scene info non-persistent
            previewScene: BundleReplicant("previewScene", "obs", { persistent: false }),
            sceneList: BundleReplicant("sceneList", "obs", { persistent: false })
        }, listeners);
    }

    async _connect() {
        const login = this.replicants.login.value;
        const status = this.replicants.status.value;
        await this.obs.connect(login.ip, login.password);
    }

    async isConnected() {
        return this.replicants.status.value.connected == "connected";
    }

    async _disconnect() {
        try {
            this.obs.disconnect();
        } catch (e) {
            this.log.error("Error disconnecting", e);
        }
    }


    async _setupListeners() {
        await this._fullUpdate();

        this.obs.on("ConnectionClosed", () => {
            this.log.warn("Connection closed");
            this.reconnect();
        });

        this.obs.on("ConnectionError", (e: Error) => {
            this.log.error("Connection error", e);
            this.reconnect();
        });

        this._replicantListeners();
        this._transitionListeners();
        this._interactionListeners();

        this.listeners.listenTo("DEBUG:callOBS", async (data, ack) => {
            if (!data.name || !data.args) {
                this.log.error("No name or args");
                sendError(ack, "No name or args");
                return;
            }

            this.log.info("Called", data.name, "with", data.args);
            try {
                const res = await this.obs.call(data.name, data.args);
                sendSuccess(ack, res);
                this.log.info("Result:", res);
            } catch (err) {
                this.log.error(`Error calling ${data.name}`);
                sendError(ack, `Error calling ${data.name}: ${err}`);
            }
        })

    }


    private _replicantListeners() {
        this.obs.on("SceneListChanged", ({ scenes }) => this._updateSceneList(scenes as { sceneName: string }[]));
        this.obs.on("SceneItemCreated", ({ sceneName }) => this._updateSceneItems(this.replicants.sceneList, sceneName, sceneName));
        this.obs.on("SceneItemRemoved", ({ sceneName }) => this._updateSceneItems(this.replicants.sceneList, sceneName, sceneName));
        this.obs.on("SceneItemTransformChanged", ({ sceneName }) => this._updateSceneItems(this.replicants.sceneList, sceneName, sceneName));

        this.obs.on("CurrentPreviewSceneChanged", ({ sceneName }) => this._updateSceneItems(this.replicants.previewScene, sceneName));
        this.obs.on("CurrentProgramSceneChanged", ({ sceneName }) => this._updateSceneItems(this.replicants.programScene, sceneName));


        // Clear or set preview on studio mode set or unset
        this.obs.on("StudioModeStateChanged", ({ studioModeEnabled }) => {
            this.replicants.status.value.studioMode = studioModeEnabled;
            if (!studioModeEnabled) this.replicants.previewScene.value = null;
            else this._tryCallOBS("GetCurrentPreviewScene")
                .then(({ currentPreviewSceneName }) => this._updateSceneItems(this.replicants.previewScene, currentPreviewSceneName))
                .catch(err => this.log.error('Error fetching preview scene:', err));
        });

        this.obs.on("RecordStateChanged", ({ outputActive }) => this.replicants.status.value.recording = outputActive);
        this.obs.on("StreamStateChanged", ({ outputActive }) => this.replicants.status.value.streaming = outputActive);
    }


    private _fullUpdate() {
        this.replicants.status.value.transitioning = false;

        return Promise.all([
            this._updateScenes().then(
                (res) => Promise.all([
                    this._updateSceneItems(this.replicants.previewScene, res.currentPreviewSceneName),
                    this._updateSceneItems(this.replicants.programScene, res.currentProgramSceneName)
                ])
            ).catch(e => this.log.error('Error updating scenes list:', e)),
            this._updateStatus()
        ]).catch(e => this.log.error('Error in full update:', e));
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
            .catch((e) => this.log.error("Error updating scene list", e));
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
            }).catch(e => this.log.error(`Error updating ${replicant.name} scene:`, e));
        }
    }


    private _fetchSceneInfo(sceneName: string): Promise<ObsScene> {
        return this._tryCallOBS("GetSceneItemList", { sceneName: sceneName })
            .then(items => ({ name: sceneName, sources: items.sceneItems as unknown as ObsSource[] }))
    }


    private _updateStatus() {
        return Promise.all([
            this._tryCallOBS('GetStudioModeEnabled').then(({ studioModeEnabled }) => this.replicants.status.value.studioMode = studioModeEnabled),
            this._tryCallOBS('GetRecordStatus').then(({ outputActive }) => this.replicants.status.value.recording = outputActive),
            this._tryCallOBS('GetStreamStatus').then(({ outputActive }) => this.replicants.status.value.streaming = outputActive)
        ]);
    }


    private async _tryCallOBS<Type extends keyof OBSRequestTypes>(requestType: Type, requestData?: OBSRequestTypes[Type], ack?: NodeCG.Acknowledgement, errMsg?: string, catchF?: (e: any) => {}) {
        this.log.info("Calling", requestType, "with", requestData);
        if (!(await this.isConnected())) {
            if (catchF) catchF("OBS is not connected");
            this.log.error(`Error calling ${requestType}: OBS is not connected`);
            if (ack) sendError(ack, `Error calling ${requestType}: OBS is not connected`);
            throw new Error("OBS is not connected");
        }

        return this.obs.call(requestType, requestData).then((res) => {
            if (ack && !ack.handled) ack();
            return res;
        }).catch((e) => {
            if (catchF) catchF(e);
            this.log.error(errMsg ? errMsg : `Error calling ${requestType}`, e);
            throw e;
        });
    }


    private _transitionListeners() {
        listenTo("transition", async (args, ack) => {
            this.log.info("Transitioning to", args);
            try {
                args = args ? args : {};
                // Mark that we're starting to transition. Resets to false after SwitchScenes.
                this.replicants.status.value.transitioning = true;

                // Set transition and duration
                if (args.transitionName) this._tryCallOBS("SetCurrentSceneTransition",
                    { "transitionName": args.transitionName }, ack, "Error setting transition"
                ).catch((e) => this.log.error("Error setting transition", e));

                if (args.transitionDuration) this._tryCallOBS("SetCurrentSceneTransitionDuration",
                    { transitionDuration: args.transitionDuration }, ack, "Error setting transiton duration"
                ).catch((e) => this.log.error("Error setting transition duration", e));;

                // Trigger transition, needs different calls outside studio mode
                if (this.replicants.status.value.studioMode) {
                    // setTimeout(() => {
                    this._tryCallOBS("TriggerStudioModeTransition", undefined, ack, "Error transitioning",
                        (e) => this.replicants.status.value.transitioning = false);
                    // }, 500);
                } else {
                    if (!args.sceneName) {
                        this.log.error("Error: Cannot transition to", args.sceneName);
                        sendError(ack, `Error: Cannot transition to ${args.sceneName}`);
                        this.replicants.status.value.transitioning = false;
                    } else this._tryCallOBS("SetCurrentProgramScene", { 'sceneName': args.sceneName }, ack, "Error transitioning",
                        (e) => this.replicants.status.value.transitioning = false);
                }
            } catch (e) {
                this.log.error(`Error transitioning with ${args}: ${e}`);
                sendError(ack, `Error transitioning with ${args}: ${e}`);
            }
        });

        listenTo("preview", async (args, ack) => {
            if (!this.replicants.status.value.studioMode) {
                this.log.error(`Cannot preview when not in studio mode`);
                sendError(ack, `Cannot preview when not in studio mode`);
            }

            this._tryCallOBS('SetCurrentPreviewScene', { 'sceneName': args.sceneName },
                ack, 'Error setting preview scene for transition:')
                .catch(e => {
                    this.log.error(`Error changing preview scene: ${e}`);
                    sendError(ack, `Error changing preview scene: ${e}`);
                })
        });

        this.replicants.programScene.on("change", (newVal, oldVal) => {
            this._sendTransitioning("", oldVal?.name, newVal?.name);
        })


        this.obs.on("SceneTransitionStarted", ({ transitionName }) => {
            const pro = this.replicants.programScene.value;
            const from = pro?.name;

            this._tryCallOBS('GetCurrentProgramScene').then(({ currentProgramSceneName }) => {
                const to = currentProgramSceneName;

                // this.replicants.obsStatus.value.transitioning = true;
                this._sendTransitioning(transitionName, from, to);
            }).catch(e => {
                this.log.error(`Error sending transitioning: ${e}`);
            });
        })

        this.obs.on("SceneTransitionEnded", () => this.replicants.status.value.transitioning = false);
        // SceneTransitionEnded doesn't trigger if user cancelled transition, so cya
        this.obs.on("CurrentProgramSceneChanged", () => {
            if (this.replicants.status.value.transitioning) {
                this.replicants.status.value.transitioning = false;
            }
        })

        listenTo("transitioning", ({ toScene }) => {
            this._lastTransitioningTarget = toScene;
            this._lastTransitioningTime = Date.now();

            clearInterval(this._transitioningHardEndTimeout ?? undefined);
            this._transitioningHardEndTimeout = setTimeout(() => this.replicants.status.value.transitioning = false, 2000);
        });

    }

    private _sendTransitioning(name: string, from?: string, to?: string) {
        // Avoid triggering duplicate transitioning events
        const now = Date.now();
        if (to == this._lastTransitioningTarget && now - 5000 < this._lastTransitioningTime) return;

        this._lastTransitioningTarget = to;
        this._lastTransitioningTime = now;

        this.replicants.status.value.transitioning = true;
        sendTo("transitioning", {
            transitionName: name,
            fromScene: from,
            toScene: to
        });
    }

    private _interactionListeners() {
        listenTo("moveItem", ({ sceneName, sceneItemId, transform }, ack) => {
            if (this.replicants.status.value.moveCams) {
                this._tryCallOBS("SetSceneItemTransform", { sceneName: sceneName, sceneItemId: sceneItemId, sceneItemTransform: transform as any })
                    .catch(e => {
                        this.log.error(`Error moving ${sceneItemId} in ${sceneName}: ${e}`);
                        sendError(ack, `Error moving ${sceneItemId} in ${sceneName}: ${e}`);
                    });
            }
        })

        // Recording Listeners
        listenTo("startRecording", async (_, ack) => {
            let error = null;
            if (!this.replicants.status.value.controlRecording) error = "Recording Control is disabled";
            else if (!(await this.isConnected())) error = "OBS is disconnected";
            else if (this.replicants.status.value.recording) error = "Recording is already in progress";

            if (error) {
                this.log.error(`Error starting recording: ${error}`);
                sendError(ack, `Error starting recording: ${error}`);
            } else {
                this.log.info("Starting Recording");
                this._tryCallOBS("StartRecord", undefined, ack)
                    .catch(err => {
                        this.log.error("Error starting recording:", err);
                        sendError(ack, `Error starting recording: ${err}`);
                    });
            }
        });

        listenTo("stopRecording", async (_, ack) => {
            let error = null;   // Check if can stop
            if (!this.replicants.status.value.controlRecording) error = "Recording Control is disabled";
            else if (!(await this.isConnected())) error = "OBS is disconnected";
            else if (!this.replicants.status.value.recording) error = "Recording is already stopped";

            if (error) {
                this.log.error(`Error stopping recording: ${error}`);
                sendError(ack, `Error stopping recording: ${error}`);
                return;
            }

            // Attempt to stop recording
            this._tryCallOBS("StopRecord", undefined, ack).catch(e => {
                this.log.error("Error stopping recording:", e);
                sendError(ack, `Error stopping recording: ${e}`);
            }).then((resp) => {
                // Rename OBS output to include run info
                if (!resp) return;
                const outputPath = resp.outputPath;
                const newFilename = this.getFilename();
                if (!newFilename) return;
                const currPath = path.parse(outputPath);
                const newName = `${currPath.name} ${newFilename.replace(/[\\/:*?"<>|]/g, " ")}${currPath.ext}`
                currPath.base = newName;
                const targetPath = path.format(currPath);
                setTimeout(() => fsPromises.rename(outputPath, targetPath)
                    .then(() => this.log.info(`Renamed ${outputPath} to ${targetPath}`))
                    .catch((e) => this.log.error(`Error renaming ${outputPath} to ${targetPath}: ${e}`)), 5000);
            }).catch(e => {
                this.log.error("Error renaming file:", e);
                sendError(ack, `Error renaming file: ${e}`);
            });
        });
    }

    getFilename() {
        const sc = getSpeedControlUtil();
        const run = sc.runDataActiveRun.value;
        if (!run) return null;
        const runners = run.teams.map(t => t.players.map(p => p.name).join(" & ")).join(" vs. ");

        const times = sc.runFinishTimes.value;
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
        ].filter(x => x).join("");
    }


}
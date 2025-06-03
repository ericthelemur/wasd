import { readFile } from 'fs';
import SpeedcontrolUtil from 'speedcontrol-util';
import { NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';
import { Configschema } from 'speedcontrol-util/types/speedcontrol/schemas';
import { Config, Countdown, CustomBreakText, SceneData, StreamState } from 'types/schemas/wasd';

import NodeCG from '@nodecg/types';

import { getNodeCG, Replicant } from '../../common/utils';

const nodecg = getNodeCG();

export const sc = new SpeedcontrolUtil(nodecg as unknown as NodeCGServer);

export const sceneData = Replicant<SceneData>("sceneData", "wasd");
export const cusomBreakText = Replicant<CustomBreakText>("customBreakText", "wasd");
export const countdown = Replicant<Countdown>('countdown', "wasd");
export const config = Replicant<Config>("config", "wasd");
export const streamState = Replicant<StreamState>("streamState", "wasd");

try {
    // Hacky way to read the default marathon code from speedcontrol
    // For some reason, they never save it in a Replicant
    // Just in config, then locally in the dashboard
    // then send the message to load -- that has been intercepted too
    // See people/extension/listeners.ts
    nodecg.log.info("Attempting to load speedcontrol config to fetch marathon code");
    readFile("cfg/nodecg-speedcontrol.json", (err, data) => {
        if (err) throw err;

        if (data) {
            const configFile = JSON.parse(data as unknown as string) as any;
            const oengusConfig = configFile.oengus as Configschema["oengus"] & { "defaultSchedule": string };    // FIX: Add deafultSchedule as Speedcontrolutil not updated with Speedcontrol yet
            if (oengusConfig) {
                const code = oengusConfig.defaultMarathon;
                if (code) {
                    nodecg.log.info("Setting marathon code to", code);
                    config.value.oengusShortcode = code;
                }
                const sch = oengusConfig.defaultSchedule;
                if (sch) {
                    nodecg.log.info("Setting slug to", sch);
                    config.value.oengusScheduleSlug = sch;
                }
            }
        }
    });
} catch (e) {
    nodecg.log.error(e);
}
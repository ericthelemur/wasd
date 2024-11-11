import SpeedcontrolUtil from 'speedcontrol-util';
import { NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';
import { Countdown, CustomBreakText, SceneData } from 'types/schemas';

import { getNodeCG, Replicant } from '../../common/utils';

const nodecg = getNodeCG();

export const sc = new SpeedcontrolUtil(nodecg as unknown as NodeCGServer);

export const sceneData = Replicant<SceneData>("sceneData", "wasd");
export const cusomBreakText = Replicant<CustomBreakText>("customBreakText", "wasd");
export const countdown = Replicant<Countdown>('countdown', "wasd");
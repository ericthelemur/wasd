import { getNodeCG, Replicant } from 'common/utils';
import SpeedcontrolUtil from 'speedcontrol-util';
import { NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';
import { CustomBreakText, SceneData } from 'types/schemas';

const nodecg = getNodeCG();

export const sc = new SpeedcontrolUtil(nodecg as unknown as NodeCGServer);

export const sceneData = Replicant<SceneData>("sceneData");
export const cusomBreakText = Replicant<CustomBreakText>("customBreakText");
import * as path from 'path';
import SpeedcontrolUtil from 'speedcontrol-util';
import { NodeCGServer } from 'speedcontrol-util/types/nodecg/lib/nodecg-instance';
import { RunDataArray } from 'speedcontrol-util/types/speedcontrol';
import { SceneData } from 'types/schemas';

import NodeCG from '@nodecg/types';

import { getNodeCG, Replicant } from './utils';

const nodecg = getNodeCG();

export const sc = new SpeedcontrolUtil(nodecg as unknown as NodeCGServer);

export const sceneData = Replicant<SceneData>("sceneData");
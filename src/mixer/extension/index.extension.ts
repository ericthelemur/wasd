import { storeX32 } from './mixer/utils';

const mixer = require("./mixer/mixer");
const x32u = new mixer.MixerCommPoint();
storeX32(x32u);

const listeners = require("./mixer/listeners");
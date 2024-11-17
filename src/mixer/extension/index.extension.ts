import { storeX32 } from './utils';

console.log("!!!!!!!!!!! Loading Mixer");

const x32 = require("./X32");
const x32u = new x32.X32Utility();
storeX32(x32u);

const list = require("./listeners");
import type NodeCG from '@nodecg/types';
import { listenTo } from '../common/listeners';
import { storeNodeCG, storeX32 } from './utils';

module.exports = async function (nodecg: NodeCG.ServerAPI) {
	storeNodeCG(nodecg);
	const x32 = require("./X32");
	const x32u = new x32.X32Utility(nodecg);
	storeX32(x32u);
	const list = require("./listeners");

	return { x32: x32u }
};

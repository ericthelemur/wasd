import type NodeCG from '@nodecg/types';
import { storeNodeCG } from './utils';

module.exports = async function (nodecg: NodeCG.ServerAPI) {
	storeNodeCG(nodecg);
	const x32 = require("./X32");
	const x32u = new x32.X32Utility(nodecg);

	return { x32: x32u }
};

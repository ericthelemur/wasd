import type NodeCG from '@nodecg/types';
import { storeNodeCG } from 'common/utils';

import type { X32Utility } from './X32';


let storedX32: X32Utility;

export function storeX32(x32: X32Utility) {
	storedX32 = x32;
}

export function getX32(): X32Utility {
	return storedX32;
}

module.exports = async function (nodecg: NodeCG.ServerAPI) {
	storeNodeCG(nodecg);

	const x32 = require("./X32");
	const x32u = new x32.X32Utility(nodecg);
	storeX32(x32u);

	const list = require("./listeners");

	return { x32: x32u };
};

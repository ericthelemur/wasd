import type NodeCG from '@nodecg/types';
import { storeNodeCG } from './utils';

module.exports = function (nodecg: NodeCG.ServerAPI) {
	storeNodeCG(nodecg);
	const replicants = require("./replicants");

	const queue = require("./queue");
	const listeners = require("./listeners");
};

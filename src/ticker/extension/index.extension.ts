import type NodeCG from '@nodecg/types';
import { Configschema } from 'types/schemas';

import { storeNodeCG } from './utils';

module.exports = function (nodecg: NodeCG.ServerAPI<Configschema>) {
	storeNodeCG(nodecg);
	const replicants = require("./replicants");

	const queue = require("./queue");
	const listeners = require("./listeners");
};

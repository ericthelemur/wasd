import type NodeCG from '@nodecg/types';
import { AnnBank, AnnPools, AnnQueue, AnnRef, Announcement, CurrentAnnouncement } from 'types/schemas';
import { storeNodeCG } from './utils';

module.exports = function (nodecg: NodeCG.ServerAPI) {
	storeNodeCG(nodecg);
	const replicants = require("./replicants");

	const queue = require("./queue");
};

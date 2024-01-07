import type NodeCG from '@nodecg/types';
import { People, Socials } from 'types/schemas';

import { storeNodeCG } from './utils';

module.exports = async function (nodecg: NodeCG.ServerAPI) {
	storeNodeCG(nodecg);
	const people = nodecg.Replicant<People>("people");
	console.log(people.value);
	const socials = nodecg.Replicant<Socials>("socials");
	console.log(socials.value);
};

import type NodeCG from '@nodecg/types';
import { People, PeopleBank, Socials } from 'types/schemas';

import { storeNodeCG } from './utils';

module.exports = async function (nodecg: NodeCG.ServerAPI) {
	storeNodeCG(nodecg);
	const people = nodecg.Replicant<People>("people");
	const socials = nodecg.Replicant<Socials>("socials");
	const peopleBank = nodecg.Replicant<PeopleBank>("peopleBank");
};

import type NodeCG from '@nodecg/types';
import { People, PeopleBank, Socials } from 'types/schemas';

import { listenTo } from '../common/listeners';
import { Replicant, storeNodeCG } from './utils';

module.exports = async function (nodecg: NodeCG.ServerAPI) {
	storeNodeCG(nodecg);
	const people = Replicant<People>("people");
	const socials = Replicant<Socials>("socials");
	const peopleBank = Replicant<PeopleBank>("peopleBank");

	listenTo("setPerson", ({ id, person }) => {
		peopleBank.value[id] = person;
	});
};

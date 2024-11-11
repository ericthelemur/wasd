import { People, PeopleBank, Socials } from 'types/schemas';

import { Replicant } from '../../common/utils';

export const people = Replicant<People>("people", "people");
export const socials = Replicant<Socials>("socials", "people");
export const peopleBank = Replicant<PeopleBank>("peopleBank", "people");
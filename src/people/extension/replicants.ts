import { People, PeopleBank, Socials } from 'types/schemas';

import { Replicant } from './utils';

export const people = Replicant<People>("people");
export const socials = Replicant<Socials>("socials");
export const peopleBank = Replicant<PeopleBank>("peopleBank");
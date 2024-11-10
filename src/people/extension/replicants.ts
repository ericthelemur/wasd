import { Replicant } from 'common/utils';
import { People, PeopleBank, Socials } from 'types/schemas';

export const people = Replicant<People>("people");
export const socials = Replicant<Socials>("socials");
export const peopleBank = Replicant<PeopleBank>("peopleBank");
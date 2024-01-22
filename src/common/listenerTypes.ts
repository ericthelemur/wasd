
import { Person } from 'types/schemas';

export type ListenerTypes = {
    setPerson: {
        id: string,
        person: Person
    },
    loadRunners: {}
}
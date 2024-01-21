import { listenTo } from '../common/listeners';
import { peopleBank } from './replicants';

listenTo("setPerson", ({ id, person }) => {
    peopleBank.value[id] = person;
});
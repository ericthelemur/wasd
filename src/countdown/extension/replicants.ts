import { Countdown, CountdownText } from 'types/schemas/wasd';
import { Replicant } from '../../common/utils';

export const countdown = Replicant<Countdown>('countdown', "wasd");
export const countdownText = Replicant<CountdownText>('countdownText', "wasd");

import { Bank, Current, Pools, Queue } from 'types/schemas';

import { Replicant } from '../../common/utils';

export const bank = Replicant<Bank>("bank", "ticker");
export const pools = Replicant<Pools>("pools", "ticker");
export const queue = Replicant<Queue>("queue", "ticker");
export const current = Replicant<Current>("current", "ticker");
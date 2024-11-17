import { Channels, Login, Muted, TechMuted, XrStatus } from 'types/schemas/mixer';

import { Replicant } from '../../common/utils';

export const status = Replicant<XrStatus>("xrStatus", "mixer");
export const login = Replicant<Login>("login", "mixer");
export const muted = Replicant<Muted>("muted", "mixer");
export const techMuted = Replicant<TechMuted>("techMuted", "mixer");
export const channels = Replicant<Channels>("channels", "mixer");

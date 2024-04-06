import type NodeCG from '@nodecg/types';
import type { Donation, Donations, Configschema, Alldonations, Total, Polls, Schedule, Targets, Rewards, Milestones, Donors, Campaign } from '../../types/schemas';
import { getNodeCG } from ".";


const nodecg = getNodeCG();
export const donations = nodecg.Replicant("donations") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Donations>;
export const allDonations = nodecg.Replicant("alldonations") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Alldonations>;
export const campaignTotal = nodecg.Replicant("total") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Total>;
export const polls = nodecg.Replicant("polls") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Polls>;
export const schedule = nodecg.Replicant("schedule") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Schedule>;
export const targets = nodecg.Replicant("targets") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Targets>;
export const rewards = nodecg.Replicant("rewards") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Rewards>;
export const milestones = nodecg.Replicant("milestones") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Milestones>;
export const donors = nodecg.Replicant("donors") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Donors>;

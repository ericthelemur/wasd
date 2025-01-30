import type NodeCG from '@nodecg/types';
import type { Donation, Donations, Alldonations, Total, Polls, Schedule, Targets, Rewards, Milestones, Donors, Campaign } from 'types/schemas/tiltify';
import { getNodeCG, Replicant } from "common/utils";

export const donations = Replicant<Donations>("donations", "tiltify");
export const allDonations = Replicant<Alldonations>("alldonations", "tiltify");
export const campaignTotal = Replicant<Total>("total", "tiltify");
export const polls = Replicant<Polls>("polls", "tiltify");
export const schedule = Replicant<Schedule>("schedule", "tiltify");
export const targets = Replicant<Targets>("targets", "tiltify");
export const rewards = Replicant<Rewards>("rewards", "tiltify");
export const milestones = Replicant<Milestones>("milestones", "tiltify");
export const donors = Replicant<Donors>("donors", "tiltify");

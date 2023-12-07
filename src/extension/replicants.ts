import NodeCG from "@nodecg/types";
import { getNodeCG } from "./utils";
import { AnnBank, AnnPools, AnnQueue, CurrentAnnouncement } from "types/schemas";

const nodecg = getNodeCG();
export const bank = nodecg.Replicant("annBank") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnBank>;
export const pools = nodecg.Replicant("annPools") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnPools>;
export const queue = nodecg.Replicant("annQueue") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnQueue>;
export const current = nodecg.Replicant("currentAnnouncement") as unknown as NodeCG.ServerReplicantWithSchemaDefault<CurrentAnnouncement>;
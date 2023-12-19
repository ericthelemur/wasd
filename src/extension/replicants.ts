import NodeCG from "@nodecg/types";
import { getNodeCG } from "./utils";
import { Bank, Pools, Queue, Current } from "types/schemas";

const nodecg = getNodeCG();
export const bank = nodecg.Replicant("bank") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Bank>;
export const pools = nodecg.Replicant("pools") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Pools>;
export const queue = nodecg.Replicant("queue") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Queue>;
export const current = nodecg.Replicant("current") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Current>;
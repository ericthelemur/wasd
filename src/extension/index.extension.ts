import type NodeCG from '@nodecg/types';
import { AnnPools, AnnQueue } from 'types/schemas';

module.exports = function (nodecg: NodeCG.ServerAPI) {
	nodecg.Replicant("annPools") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnPools>;
	nodecg.Replicant("annQueue") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnQueue>;
	// const exampleReplicant = nodecg.Replicant('exampleReplicant') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ExampleReplicant>;
	// setInterval(() => {
	// 	exampleReplicant.value.age++;
	// 	console.log(exampleReplicant.value);
	// }, 5000);
};

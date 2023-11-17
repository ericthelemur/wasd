import type NodeCG from '@nodecg/types';
import type { Settings } from "../types/schemas";

module.exports = function (nodecg: NodeCG.ServerAPI) {
	// const exampleReplicant = nodecg.Replicant('exampleReplicant') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ExampleReplicant>;
	// setInterval(() => {
	// 	exampleReplicant.value.age++;
	// 	console.log(exampleReplicant.value);
	// }, 5000);

	const settingsRep = nodecg.Replicant("settings", { persistent: true, defaultValue: { "autoapprove": false } }) as unknown as Settings;
};

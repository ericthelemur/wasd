import type NodeCG from '@nodecg/types';
import { AnnBank, AnnPools, AnnQueue, AnnRef, Announcement } from 'types/schemas';

const QUEUE_LEN = 12;
const DISPLAY_TIME = 5000;

module.exports = function (nodecg: NodeCG.ServerAPI) {
	const bank = nodecg.Replicant("annBank") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnBank>;
	const pools = nodecg.Replicant("annPools") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnPools>;
	const queue = nodecg.Replicant("annQueue") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnQueue>;
	const current = nodecg.Replicant("currentAnnouncement") as unknown as NodeCG.ServerReplicantWithSchemaDefault<Announcement>;

	function lastQueued(time: number) {
		const times: { [id: string]: number } = {};
		queue.value.announcements.forEach((ref, i) => {
			times[ref.id] = time + DISPLAY_TIME * i;
		});
		return times;
	}

	function pickNext(time: number) {
		const lastQueuedTimes = lastQueued(time);
		var maxRef: AnnRef | undefined;
		var maxAnn: Announcement | undefined;
		var maxPriority = 0;
		for (const pool of Object.values(pools.value)) {
			for (const ref of pool.announcements) {
				const ann = bank.value[ref.id];
				const age = lastQueuedTimes[ref.id] || ann.lastShown || time - 5 * 60 * 10000;
				const timeSince = (time - age) / 1000;
				const weight = pool.priority * ann.priority * timeSince;

				if (maxPriority < weight) {
					maxPriority = weight;
					maxRef = ref;
					maxAnn = ann;
				}
			}
		}
		return maxRef;
	}

	queue.on("change", (val) => {
		nodecg.log.info("Queue change", val.announcements.length);
		if (val.announcements.length < QUEUE_LEN) {
			nodecg.log.info("Queueing new announcement");
			const next = pickNext(Date.now() + DISPLAY_TIME * val.announcements.length);
			nodecg.log.info("Queueing", next);
			if (next) val.announcements.push({ id: next.id, time: Date.now() });
		}
	});
};

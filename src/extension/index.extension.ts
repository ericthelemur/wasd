import type NodeCG from '@nodecg/types';
import { AnnBank, AnnPools, AnnQueue, AnnRef, Announcement, CurrentAnnouncement } from 'types/schemas';

const QUEUE_LEN = 12;
const DISPLAY_TIME = 10000;

module.exports = function (nodecg: NodeCG.ServerAPI) {
	const bank = nodecg.Replicant("annBank") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnBank>;
	const pools = nodecg.Replicant("annPools") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnPools>;
	const queue = nodecg.Replicant("annQueue") as unknown as NodeCG.ServerReplicantWithSchemaDefault<AnnQueue>;
	const current = nodecg.Replicant("currentAnnouncement") as unknown as NodeCG.ServerReplicantWithSchemaDefault<CurrentAnnouncement>;

	function lastQueued(time: number) {
		const nextTime = current.value.endTime;
		const times: { [id: string]: number } = {};
		queue.value.announcements.forEach((ref, i) => {
			times[ref.id] = nextTime + DISPLAY_TIME * i;
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

	// Add new to queue when below min length
	queue.on("change", (val) => {
		while (val.announcements.length < QUEUE_LEN) {
			const dispTime = Date.now() + DISPLAY_TIME * (val.announcements.length + 1);
			const next = pickNext(dispTime);
			if (next) {
				nodecg.log.info("Queueing", next);
				val.announcements.push({ id: next.id, time: Date.now() })
			}
		}
	});

	// Keep current ann text up to date with bank
	bank.on("change", (val) => {
		if (current.value && current.value.annID) {
			const currRef = current.value.annID;
			const bankAnn = bank.value[currRef];
			if (!bankAnn) return;
			if (current.value.text !== bankAnn.text) {
				current.value.text = bankAnn.text;
			}
		}
	});

	function playNext() {
		nodecg.log.info("Moving to next donation");
		if (queue.value.announcements) {
			const [newRef] = queue.value.announcements.splice(0, 1);
			if (!newRef) return nodecg.log.warn("Reading null value on queue");
			const newAnn = bank.value[newRef.id];
			if (!newAnn) return nodecg.log.warn("No announcement found for ref", newRef.id);
			current.value = {
				text: newAnn.text,
				annID: newRef.id,
				endTime: Date.now() + DISPLAY_TIME
			}
		}
	}

	const now = Date.now();
	if (current.value.endTime < now) playNext();
	setTimeout(() => {
		setInterval(playNext, DISPLAY_TIME);
	}, Math.max(1, current.value.endTime - now))
};

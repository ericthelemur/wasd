import '../../graphics/uwcs-bootstrap.css';

import { DragDropContext, DragStart, DraggableLocation, DropResult } from 'react-beautiful-dnd';
import { Pause, Play, PlusLg, Trash } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import { createRoot } from 'react-dom/client';
import { useReplicant } from 'use-nodecg';
import { AnnBank, AnnPool, AnnPools, AnnQueue, Announcement, CurrentAnnouncement } from '../../types/schemas';

import { useState } from 'react';
import InputGroup from 'react-bootstrap/InputGroup';
import { AnnPoolComp } from './components/annpool';
import { sendTo, sendToF } from 'common/listeners';
import { klona } from "klona";

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric", second: "numeric" });

export function AnnouncementsPanel() {
	const [showBin, setShowBin] = useState(false);
	const [pools,] = useReplicant<AnnPools>("annPools", {});
	const [bank,] = useReplicant<AnnBank>("annBank", {});
	const [queue,] = useReplicant<AnnQueue>("annQueue", { "name": "Queue", "priority": 0, "announcements": [] });
	const [currentAnnouncement,] = useReplicant<CurrentAnnouncement>("currentAnnouncement", { "text": "", "annID": null, "endTime": 0 });
	// console.log(pools);
	if (!pools) return <h2>Not loaded announcements</h2>;

	function onBeforeDragStart(start: DragStart) {
		if (start.source.droppableId === "queue") setShowBin(true);
	}

	function onDragEnd(result: DropResult) {
		if (showBin) setShowBin(false);
		const { source, destination } = result;
		if (!destination) return;

		if (source.droppableId !== "queue" && destination.droppableId !== "queue") {
			if (source.index === destination.index) return;
			const sa = pools![source.droppableId].announcements;
			const da = pools![destination.droppableId].announcements;
			console.log(sa.map(a => a.id).join(", "));
			const ind = source.index < destination.index ? destination.index + 1 : destination.index;
			sendTo("movePool", {
				aref: klona(sa[source.index]),
				oldpid: source.droppableId,
				newpid: destination.droppableId,
				before: klona(destination.index === da.length ? null : da[ind])
			})
		} else if (source.droppableId === "queue" && destination.droppableId === "queue") sendTo("reorderQueue", {
			aref: queue!.announcements[source.index],
			before: queue!.announcements[destination.index]
		})
		else if (source.droppableId !== "queue" && destination.droppableId === "queue") sendTo("enqueue", {
			aid: pools![source.droppableId].announcements[source.index].id,
			before: queue!.announcements[destination.index]
		})
		else { // (source.droppableId === "queue" && destination.droppableId !== "queue")
			sendTo("dequeue", { aref: queue!.announcements[source.index] })
		}
	}

	const currentAnn = bank && currentAnnouncement && currentAnnouncement.annID ? bank[currentAnnouncement.annID] : undefined;

	const qeueContents = queue!.announcements.map(aid => bank![aid.id]);
	return (
		<div className="vstack" style={{ height: "100vh" }}>
			<iframe src="/bundles/wasd/graphics/bar.graphic.html" height="70" width="100%" className="sticky-top" style={{ maxWidth: 1920, margin: "auto" }} />
			<div className='container-xxl h-0 flex-grow-1'>
				<DragDropContext onDragEnd={onDragEnd} onBeforeDragStart={onBeforeDragStart}>
					<div className='d-flex gap-3 h-100'>
						<div className="w-50 overflow-scroll sticky-top">
							{currentAnnouncement && currentAnn && (<div className="p-2">
								<InputGroup className="card-ctrls announcement float-end">
									<Button variant="outline-primary" onClick={() => currentAnnouncement.pause = !currentAnnouncement.pause}>{currentAnnouncement.pause ? <Play /> : <Pause />}</Button>
								</InputGroup>
								<h3>Current</h3>
								<div className="card announcement m-1">
									<div className="card-body hstack gap-2">
										<span className="flex-grow-1 line-clamp-1">
											{currentAnn.text}
										</span>
										<span className="flex-shrink-0">
											{currentAnnouncement.pause ? "paused" : `until ${timeFormat.format(currentAnnouncement.endTime)}`}
										</span>
									</div>
								</div>
							</div>)}
							{queue && (<div className="p-2">
								<h3>Queue</h3>
								<AnnPoolComp id="queue" pool={queue} contents={qeueContents} />
							</div>)}
						</div>
						<div className="vstack w-50">
							<h2>Announcement Pools</h2>
							<Button className="d-inline" onClick={sendToF("addPool", {})}><PlusLg /> Add Pool</Button>
							<div className="pools overflow-scroll vstack gap-3 p-2">
								{Object.entries(pools).map(([pid, pool]) => {
									if (pool === undefined) return <h3 key={pid}>Error: Corresponding Pool does not exist for pool id {pid}</h3>
									const contents = pool.announcements.map(aid => bank![aid.id]);
									return <AnnPoolComp id={pid} key={pid} pool={pool} contents={contents} />
								})}
								{showBin && <div className="trash"><Trash className="queue-trash" /></div>}
							</div>
						</div>
					</div>
				</DragDropContext >
			</div>
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<AnnouncementsPanel />);

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
import { sendToF } from 'common/listeners';

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric", second: "numeric" });

function reorder(pool: AnnPool, startIndex: number, endIndex: number) {
	const result = Array.from(pool.announcements);
	const [removed] = result.splice(startIndex, 1);
	result.splice(endIndex, 0, removed);
	pool.announcements = result;
};

function move(source: AnnPool, destination: AnnPool, droppableSource: DraggableLocation, droppableDestination: DraggableLocation) {
	const src = Array.from(source.announcements);
	const dst = Array.from(destination.announcements);
	const [removed] = src.splice(droppableSource.index, 1);
	dst.splice(droppableDestination.index, 0, removed);
	source.announcements = src;
	destination.announcements = dst;
};


function genID(prefix: string, exclusions: string[]) {
	var id;
	do {
		id = `${prefix}-${Math.floor(Math.random() * 100000000)}`;
	} while (exclusions.includes(id));
	return id;
}


function movePools(source: DraggableLocation, destination: DraggableLocation, pools: AnnPools) {
	const srcPool = pools![source.droppableId];
	const destPool = pools![destination.droppableId];

	if (!srcPool || !destPool) return;

	if (source.droppableId === destination.droppableId) {
		reorder(srcPool, source.index, destination.index);
	} else {
		move(srcPool, destPool, source, destination);
	}
}


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

		if (source.droppableId !== "queue" && destination.droppableId !== "queue") movePools(source, destination, pools!);
		else if (source.droppableId === "queue" && destination.droppableId === "queue") reorder(queue!, source.index, destination.index);
		else if (source.droppableId !== "queue" && destination.droppableId === "queue") {
			const key = pools![source.droppableId].announcements[source.index];
			queue!.announcements.splice(destination.index, 0, { id: key.id, time: Date.now() });
		} else { // (source.droppableId === "queue" && destination.droppableId !== "queue")
			queue!.announcements.splice(source.index, 1);
		}
	}

	function unlink(id: string, index: number, pool: AnnPool, newType: string = "temp") {
		const oldAnn = bank![id];
		const newID = genID(newType === "temp" ? "temp" : "ann", Object.keys(bank!));
		bank![newID] = {
			"text": oldAnn.text,
			"priority": oldAnn.priority,
			"type": newType
		}
		pool.announcements[index] = { id: newID, time: Date.now() };
		return newID;
	}

	function skipTo(index: number, id: string, ann: Announcement) {
		queue!.announcements.splice(0, index);
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
								<AnnPoolComp id="queue" pool={queue} contents={qeueContents} unlink={unlink} skipTo={skipTo} />
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

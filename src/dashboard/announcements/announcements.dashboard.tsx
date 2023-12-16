import '../../graphics/uwcs-bootstrap.css';

import { Announce, DragDropContext, DragStart, DraggableLocation, DropResult } from 'react-beautiful-dnd';
import { Pause, Play, PlusLg, Trash } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import { createRoot } from 'react-dom/client';
import { useReplicant } from 'use-nodecg';
import { AnnBank, AnnPool, AnnPools, AnnQueue, AnnRef, Announcement, CurrentAnnouncement } from '../../types/schemas';

import { createRef, useEffect, useState } from 'react';
import InputGroup from 'react-bootstrap/InputGroup';
import { AnnPoolComp } from './components/annpool';
import { sendTo, sendToF } from 'common/listeners';
import { klona } from "klona";

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric", second: "numeric" });

interface HoverStates {
	dragging: boolean;
	hoverQueue: boolean;
	showBin: boolean;
}

export interface PreludeInfo {
	lastCA: AnnRef | null;
	prelude: AnnRef[];
	length: number;
}

function sendDragAndDropMove(source: DraggableLocation, destination: DraggableLocation, queue: AnnQueue, pools: AnnPools, preludeLength: number) {
	if (source.droppableId !== "queue" && destination.droppableId !== "queue") {
		// Moving pools (pool to pool)
		if (source.index === destination.index) return;
		const da = pools![destination.droppableId].announcements;
		// Adjust for removal of old changing index of drop location
		const ind = source.droppableId === destination.droppableId && source.index < destination.index ? destination.index + 1 : destination.index;
		sendTo("movePool", {
			aref: klona(pools![source.droppableId].announcements[source.index]),
			oldpid: source.droppableId,
			newpid: destination.droppableId,
			before: klona(destination.index === da.length ? null : da[ind])
		})
	} else if (source.droppableId === "queue" && destination.droppableId === "queue") {
		sendTo("reorderQueue", { // Reordering queue elements (queue to queue)
			aref: queue!.announcements[source.index - preludeLength],
			before: queue!.announcements[destination.index - preludeLength]
		});
	} else if (source.droppableId !== "queue" && destination.droppableId === "queue") {
		sendTo("enqueue", { // Adding to queue (pool to queue)
			aid: pools![source.droppableId].announcements[source.index].id,
			before: queue!.announcements[destination.index - preludeLength]
		})
	} else { // (source.droppableId === "queue" && destination.droppableId !== "queue")
		// Removing from queue (queue to pool)
		sendTo("dequeue", { aref: queue!.announcements[source.index - preludeLength] })
	}
}

function CurrentRun({ currentAnnouncement }: { currentAnnouncement: CurrentAnnouncement }) {
	return <>
		<h3>Current</h3>
		<div className="card announcement m-1">
			<div className="card-body hstack gap-2">
				<span className="flex-grow-1 line-clamp-1">
					{currentAnnouncement.text}
				</span>
				<span className="flex-shrink-0">
					{currentAnnouncement.pause ? "paused" : `until ${timeFormat.format(currentAnnouncement.endTime)}`}
				</span>
			</div>
		</div>
	</>
}

function Pools({ pools, bank, showBin }: { pools: AnnPools, bank: AnnBank, showBin: boolean }) {
	return <div className="vstack w-50">
		<h2>Announcement Pools</h2>
		<Button className="d-inline" onClick={sendToF("addPool", {})}><PlusLg /> Add Pool</Button>
		<div className="pools overflow-auto vstack gap-3 p-2">
			{Object.entries(pools).map(([pid, pool]) => {
				if (pool === undefined) return <h3 key={pid}>Error: Corresponding Pool does not exist for pool id {pid}</h3>
				const contents = pool.announcements.map(aid => bank![aid.id]);
				return <AnnPoolComp id={pid} key={pid} pool={pool} contents={contents} />
			})}
			{showBin && <div className="trash"><Trash className="queue-trash" /></div>}
		</div>
	</div>
}

function BarIframe() {
	return <iframe src="/bundles/wasd/graphics/bar.graphic.html" height="70" width="1920" className="sticky-top" />;
}

const defaultPrelude = () => ({ lastCA: null, prelude: [], length: 0 });
export function AnnouncementsPanel() {
	const [hv, setHover] = useState<HoverStates>({ dragging: false, hoverQueue: false, showBin: false });
	const [prelude, setPrelude] = useState<PreludeInfo>(defaultPrelude());

	const [pools,] = useReplicant<AnnPools>("annPools", {});
	const [bank,] = useReplicant<AnnBank>("annBank", {});
	const [queue,] = useReplicant<AnnQueue>("annQueue", { "name": "Queue", "priority": 0, "announcements": [] });
	const [currentAnnouncement,] = useReplicant<CurrentAnnouncement>("currentAnnouncement", { "text": "", "annID": null, "endTime": 0 });
	// console.log(pools);
	if (!pools) return <h2>Not loaded announcements</h2>;

	// Maintain prelude list
	if ((hv.dragging || hv.hoverQueue) && currentAnnouncement !== undefined && currentAnnouncement.text !== "") {
		if (prelude.length === 0) {
			console.log("Setting length", queue!.announcements.length);
			setPrelude({ ...prelude, length: queue!.announcements.length });
		}
		if (prelude.lastCA === null) {	// Record current announcement as last if just started
			setPrelude({ ...prelude, lastCA: { id: currentAnnouncement.annID!, time: currentAnnouncement.time } });
		} else if (prelude.prelude.length > queue!.announcements.length / 2) {
			setPrelude({ ...prelude, prelude: [] });	// Clear prelude if half of queue
		} else if (prelude.lastCA.id != currentAnnouncement.annID && prelude.lastCA.time != currentAnnouncement.time) {
			// Add new announcement to prelude
			const lca = { id: currentAnnouncement.annID!, time: currentAnnouncement.time };
			setPrelude({ ...prelude, lastCA: lca, prelude: [...prelude.prelude, lca] });
		}
	}
	// Reset prelude on dragging stop
	if (!hv.dragging && !hv.hoverQueue && prelude.prelude.length > 0) setPrelude(defaultPrelude());


	function onBeforeDragStart(start: DragStart) {
		// Register drag start and show bin if dragging out of queue
		setHover({ ...hv, dragging: true, showBin: start.source.droppableId === "queue" });
	}

	function onDragEnd(result: DropResult) {
		// Reset bin + prelude
		setHover({ ...hv, dragging: false, showBin: false });
		setPrelude(defaultPrelude());

		// Trigger correct effect of the move
		const { source, destination } = result;
		if (!destination) return;
		sendDragAndDropMove(source, destination, queue!, pools!, prelude.prelude.length);
	}

	// Fetch current announcement object from announcement bank
	const currentAnn = bank && currentAnnouncement && currentAnnouncement.annID ? bank[currentAnnouncement.annID] : undefined;

	const queueContents = queue!.announcements.map(aid => bank![aid.id]);
	const queuePreludeAnns = prelude.prelude.map(aid => bank![aid.id]);
	return (
		<div className="vstack" style={{ height: "100vh" }}>
			<div className='container-xxl h-0 flex-grow-1'>
				<BarIframe />
				<DragDropContext onDragEnd={onDragEnd} onBeforeDragStart={onBeforeDragStart}>
					<div className='d-flex gap-3 h-100'>
						<div className="w-50 overflow-auto sticky-top">
							{currentAnnouncement && currentAnn && (<div className="p-2">
								<InputGroup className="card-ctrls announcement float-end">
									<Button variant="outline-primary" onClick={() => currentAnnouncement.pause = !currentAnnouncement.pause}>{currentAnnouncement.pause ? <Play /> : <Pause />}</Button>
								</InputGroup>
								<CurrentRun currentAnnouncement={currentAnnouncement} />
							</div>)}
							{queue && (<div className="p-2" onMouseEnter={() => setHover({ ...hv, hoverQueue: true })} onMouseLeave={() => setHover({ ...hv, hoverQueue: false })}>
								<h3>Queue</h3>
								<AnnPoolComp id="queue" pool={queue} contents={queueContents} preludeInfo={prelude} prelude={queuePreludeAnns} />
							</div>)}
						</div>
						<Pools pools={pools} bank={bank!} showBin={hv.showBin} />
					</div>
				</DragDropContext >
			</div>
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<AnnouncementsPanel />);

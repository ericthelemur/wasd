import '../../graphics/uwcs-bootstrap.css';

import {
	DragDropContext, Draggable, DraggableLocation, DropResult, Droppable, DroppableProvided
} from 'react-beautiful-dnd';
import { PlusLg, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import { createRoot } from 'react-dom/client';
import { AnnBank, AnnPool, AnnPools, AnnQueue, Announcement } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import { AnnPoolComp, AnnouncementComp } from './components/announcement';


function reorder(pool: AnnPool, startIndex: number, endIndex: number) {
	const result = Array.from(pool.announcements);
	const [removed] = result.splice(startIndex, 1);
	result.splice(endIndex, 0, removed);
	pool.announcements = result;
};

function move(source: AnnPool, destination: AnnPool, droppableSource: DraggableLocation, droppableDestination: DraggableLocation) {
	console.log("move", source, destination);
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

function addPool(pools: AnnPools) {
	const id = genID("pool", Object.keys(pools));

	pools[id] = {
		"name": "New",
		"priority": 0,
		"announcements": []
	}
}

function addAnn(bank: AnnBank, temp = false) {
	const id = genID(temp ? "temp" : "ann", Object.keys(bank));

	bank[id] = {
		"text": "New Announcement",
		"priority": 0
	}
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
	const [pools, setPools] = useReplicant<AnnPools>("annPools", {});
	const [bank, setBank] = useReplicant<AnnBank>("annBank", {});
	const [queue, setQueue] = useReplicant<AnnQueue>("annQueue", { "name": "Queue", "priority": 0, "announcements": [] });
	// const [announcement, setAnnouncement] = useReplicant<Announcement>("announcement", { "id": "-", "text": "", "repeat": false, "priority": 1, "pool": null });
	console.log(pools);
	if (!pools) return <h2>Not loaded announcements</h2>;

	function ensureUpdate(updateBank: boolean = true, updatePools: boolean = true, updateQueue: boolean = true) {
		if (updateBank) setBank(bank!);
		if (updatePools) setPools(pools!);
		if (updateQueue) setQueue(queue!);
	}

	function onDragEnd(result: DropResult) {
		const { source, destination } = result;
		if (!destination) return;

		if (source.droppableId !== "queue" && destination.droppableId !== "queue") movePools(source, destination, pools!);
		else if (source.droppableId === "queue" && destination.droppableId === "queue") reorder(queue!, source.index, destination.index);
		else if (source.droppableId !== "queue" && destination.droppableId === "queue") {
			queue!.announcements.splice(destination.index, 0, pools![source.droppableId].announcements[source.index]);
		} else { // (source.droppableId === "queue" && destination.droppableId !== "queue")
			queue!.announcements.splice(source.index, 1);
		}

		ensureUpdate();
	}

	const newAnn = () => addAnn(bank!);
	const qeueContents = queue!.announcements.map(aid => bank![aid]);
	return (
		<div className='container-xxl' style={{ height: "100vh" }}>
			<DragDropContext onDragEnd={onDragEnd}>
				<div className='d-flex h-100'>
					<div className="w-50 overflow-scroll sticky-top">
						{queue && (<>
							<h3>Queue</h3>
							<AnnPoolComp id="queue" pool={queue} contents={qeueContents}
								ensureUpdate={ensureUpdate} addAnn={() => addAnn(bank!, true)} />
						</>)}
					</div>
					<div className="vstack w-50">
						<h2>Announcement Pools</h2>
						<Button className="d-inline" onClick={() => { addPool(pools); ensureUpdate() }}><PlusLg /> Add Pool</Button>
						<div className="overflow-scroll">
							{Object.entries(pools).map(([id, pool]) => {
								if (pool === undefined) return <h3 key={id}>Error: Corresponding Pool does not exist for pool id {id}</h3>
								const contents = pool.announcements.map(aid => bank![aid]);
								return <AnnPoolComp id={id} key={id} pool={pool} contents={contents}
									ensureUpdate={ensureUpdate} addAnn={newAnn} />
							})}
						</div>
					</div>
				</div>
			</DragDropContext >
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<AnnouncementsPanel />);

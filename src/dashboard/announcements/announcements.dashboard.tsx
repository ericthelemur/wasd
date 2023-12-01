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
	const [removed] = source.announcements.splice(droppableSource.index, 1);
	destination.announcements.splice(droppableDestination.index, 0, removed);
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

function addAnn(bank: AnnBank) {
	const id = genID("ann", Object.keys(bank));

	bank[id] = {
		"text": "New Announcement",
		"priority": 0
	}
	return id;
}


export function AnnouncementsPanel() {
	const [pools, setPools] = useReplicant<AnnPools>("annPools", {});
	const [bank, setBank] = useReplicant<AnnBank>("annBank", {});
	const [queue, setQueue] = useReplicant<AnnQueue>("annQueue", { "name": "Queue", "priority": 0, "announcements": [] });
	// const [announcement, setAnnouncement] = useReplicant<Announcement>("announcement", { "id": "-", "text": "", "repeat": false, "priority": 1, "pool": null });
	console.log(pools);
	if (!pools) return <h2>Not loaded announcements</h2>;

	function ensureUpdate() {
		setPools(pools!);
	}

	const newAnn = () => addAnn(bank!);

	function movePools(source: DraggableLocation, destination: DraggableLocation) {
		const srcPool = pools![source.droppableId];
		const destPool = pools![destination.droppableId];

		if (!srcPool || !destPool) return;

		if (source.droppableId === destination.droppableId) {
			reorder(srcPool, source.index, destination.index);
		} else {
			move(srcPool, destPool, source, destination);
		}
	}

	function onDragEnd(result: DropResult) {
		const { source, destination } = result;
		if (!destination) return;

		if (source.droppableId !== "queue" && destination.droppableId !== "queue") movePools(source, destination);
		// else if (source.droppableId === "queue" && destination.droppableId === "queue") {
		// 	reorder(srcPool, source.index, destination.index);
		// 	const [removed] = queue.splice(startIndex, 1);
		// 	queue.splice(endIndex, 0, removed);
		// } else if (source.droppableId !== "queue" && destination.droppableId === "queue") {
		// } else { // (source.droppableId === "queue" && destination.droppableId !== "queue")
		// }

		ensureUpdate();
	}

	return (
		<div className='container-xxl' style={{ height: "100vh" }}>
			<DragDropContext onDragEnd={onDragEnd}>
				<div className='d-flex h-100'>
					{/* <div className="w-50 overflow-scroll sticky-top">
						{queue && (<><h3>Queue</h3><AnnQueueComp queue={queue} announcements={announcements} ensureUpdate={ensureUpdate} /></>)}
					</div> */}
					<div className="vstack w-50 overflow-scroll">
						<h2>Announcement Pools</h2>
						<Button className="d-inline" onClick={() => { addPool(pools); ensureUpdate() }}><PlusLg /> Add Pool</Button>
						{Object.entries(pools).map(([id, pool]) => {
							if (pool === undefined) return <h3 key={id}>Error: Corresponding Pool does not exist for pool id {id}</h3>
							const contents = pool.announcements.map(aid => bank![aid]);
							console.log("CONTENTS", contents);
							return <AnnPoolComp id={id} key={id} pool={pool} contents={contents} ensureUpdate={ensureUpdate} addAnn={newAnn} />
						})}
					</div>
				</div>
			</DragDropContext >
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<AnnouncementsPanel />);

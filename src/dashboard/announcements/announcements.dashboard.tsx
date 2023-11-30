import '../../graphics/uwcs-bootstrap.css';

import {
    DragDropContext, Draggable, DraggableLocation, DropResult, Droppable, DroppableProvided
} from 'react-beautiful-dnd';
import { PlusLg, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import { createRoot } from 'react-dom/client';
import { AnnPool, AnnPools, AnnQueue, AnnRef, Announcement } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import { AnnPoolComp, AnnouncementComp } from './components/announcement';

function reorder(pool: AnnPool, startIndex: number, endIndex: number) {
	const result = Array.from(pool.order);
	const [removed] = result.splice(startIndex, 1);
	result.splice(endIndex, 0, removed);
	pool.order = result;
};

function move(source: AnnPool, destination: AnnPool, droppableSource: DraggableLocation, droppableDestination: DraggableLocation) {
	console.log("move", source, destination);
	const key = source.order[droppableSource.index];
	const data = source.announcements[key];
	destination.announcements[key] = data;
	delete source.announcements[key];
	source.order.splice(droppableSource.index, 1);
	destination.order.splice(droppableDestination.index, 0, key);
};

function addPool(announcements: AnnPools) {
	var id;
	do {
		id = `pool-${Math.floor(Math.random() * 100000000)}`;
	} while (announcements.order.includes(id));

	announcements.pools[id] = {
		"name": "New",
		"priority": 1,
		"announcements": {},
		"order": []
	}
	announcements.order.push(id);
}


export function AnnouncementsPanel() {
	const [announcements, setAnnouncements] = useReplicant<AnnPools>("annPools", { pools: {}, order: [] });
	const [queue, setQueue] = useReplicant<AnnQueue>("annQueue", []);
	// const [announcement, setAnnouncement] = useReplicant<Announcement>("announcement", { "id": "-", "text": "", "repeat": false, "priority": 1, "pool": null });
	console.log(announcements);
	if (!announcements) return <h2>Not loaded announcements</h2>;

	function ensureUpdate() {
		setAnnouncements(announcements!);
	}

	function onDragEnd(result: DropResult) {
		const { source, destination } = result;
		if (!destination) return;

		const srcPool = announcements!.pools[source.droppableId];
		const destPool = announcements!.pools[destination.droppableId];

		if (!srcPool || !destPool) return;

		if (source.droppableId === destination.droppableId) {
			reorder(srcPool, source.index, destination.index);
		} else {
			move(srcPool, destPool, source, destination);
		}
		ensureUpdate();
	}

	return (
		<div className='container-xxl' style={{ height: "100vh" }}>
			<DragDropContext onDragEnd={onDragEnd}>
				<div className='d-flex h-100'>
					{/* <div className="w-50 overflow-scroll sticky-top">
						{queue && (<><h3>Queue</h3><AnnouncementPoolComp pool={queue} ensureUpdate={ensureUpdate} controls={false} /></>)}
					</div> */}
					<div className="vstack w-50 overflow-scroll">
						<h2>Announcement Pools</h2>
						<Button onClick={() => addPool(announcements)}><PlusLg /></Button>
						{announcements.order.map((id) => {
							const pool = announcements.pools[id];
							if (pool === undefined) return <h3 key={id}>Error: Corresponding Pool does not exist for pool id {id}</h3>
							return <AnnPoolComp pool={pool} ensureUpdate={ensureUpdate} id={id} key={id} />
						})}
					</div>
				</div>
			</DragDropContext >
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<AnnouncementsPanel />);

import '../../graphics/uwcs-bootstrap.css';

import {
    DragDropContext, Draggable, DraggableLocation, DropResult, Droppable, DroppableProvided
} from 'react-beautiful-dnd';
import { XLg } from 'react-bootstrap-icons';
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
	const [removed] = source.order.splice(droppableSource.index, 1);
	destination.order.splice(droppableDestination.index, 0, removed);
};


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
						{announcements.order.map((id) => {
							const pool = announcements.pools[id];
							return (
								<div key={id}>
									<h3>{pool.name}</h3>
									<AnnPoolComp pool={pool} ensureUpdate={ensureUpdate} id={id} />
								</div>
							)
						})}
					</div>
				</div>
			</DragDropContext >
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<AnnouncementsPanel />);

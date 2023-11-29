import '../../graphics/uwcs-bootstrap.css';

import React from 'react';
import {
    DragDropContext, Draggable, DraggableLocation, DropResult, Droppable, DroppableProvided
} from 'react-beautiful-dnd';
import { XLg } from 'react-bootstrap-icons';
import { createRoot } from 'react-dom/client';
import { Announcement, AnnouncementPool, Announcements } from 'types/schemas/announcements';
import { useReplicant } from 'use-nodecg';

import { AnnouncementComp, AnnouncementPoolComp } from './components/announcement';

function reorder(pool: AnnouncementPool, startIndex: number, endIndex: number) {
	const result = Array.from(pool.items);
	const [removed] = result.splice(startIndex, 1);
	result.splice(endIndex, 0, removed);
	pool.items = result;
};

function move(source: AnnouncementPool, destination: AnnouncementPool, droppableSource: DraggableLocation, droppableDestination: DraggableLocation) {
	const [removed] = source.items.splice(droppableSource.index, 1);
	destination.items.splice(droppableDestination.index, 0, removed);
};


export function AnnouncementsPanel() {
	var [announcements, setAnnouncements] = useReplicant<Announcements>("announcements", []);
	var [queue, setQueue] = useReplicant<AnnouncementPool>("announcementQueue", { name: "queue", "priority": 1, "items": [] });
	const [announcement, setAnnouncement] = useReplicant<Announcement>("announcement", { "id": "-", "text": "", "repeat": false, "priority": 1, "pool": null });

	function onDragEnd(result: DropResult) {
		const { source, destination } = result;
		if (!destination) return;

		const srcPool = announcements!.find(p => p.name === source.droppableId)!;
		const destPool = announcements!.find(p => p.name === destination.droppableId)!;
		if (!srcPool || !destPool) return;

		if (source.droppableId === destination.droppableId) {
			reorder(srcPool, source.index, destination.index);
		} else {
			move(srcPool, destPool, source, destination);
		}
	}

	return (
		<div className='container-xxl' style={{ height: "100vh" }}>
			<DragDropContext onDragEnd={onDragEnd}>
				<div className='d-flex h-100'>
					<div className="w-50 overflow-scroll sticky-top">
						{queue && <AnnouncementPoolComp pool={queue} />}
					</div>
					<div className="vstack w-50 overflow-scroll">
						{announcements!.map((pool) => (
							<div key={pool.name}>
								<h2>{pool.name}</h2>
								<AnnouncementPoolComp pool={pool} />
							</div>
						))}
					</div>
				</div>
			</DragDropContext >
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<AnnouncementsPanel />);

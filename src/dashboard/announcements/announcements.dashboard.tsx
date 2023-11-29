import '../../graphics/uwcs-bootstrap.css';

import React from 'react';
import {
    DragDropContext, Draggable, DropResult, Droppable, DroppableProvided
} from 'react-beautiful-dnd';
import { XLg } from 'react-bootstrap-icons';
import { createRoot } from 'react-dom/client';
import { Announcement, AnnouncementPool, Announcements } from 'types/schemas/announcements';
import { useReplicant } from 'use-nodecg';

import { AnnouncementComp } from './components/announcement';

function reorder(list: Announcement[], startIndex: number, endIndex: number) {
	const result = Array.from(list);
	const [removed] = result.splice(startIndex, 1);
	result.splice(endIndex, 0, removed);
	return result;
};

export function AnnouncementsPanel() {
	var [announcements, setAnnouncements] = useReplicant<Announcements>("announcements", []);
	const [announcement, setAnnouncement] = useReplicant<Announcement>("announcement", { "id": "-", "text": "", "repeat": false, "priority": 1, "pool": null });
	if (announcements === undefined) return null;

	function onDragEnd(result: DropResult) {
		if (!result.destination) return;

		console.log(announcements);
		const items = reorder(announcements![0].items, result.source.index, result.destination.index);
		announcements![0].items = items;
		console.log(announcements);
		setAnnouncements(announcements!);
	}

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			{announcements!.map((pool, index) => (
				<Droppable droppableId={pool.name}>
					{(provided) => (
						<div
							className='vstack p-2'
							{...provided.droppableProps}
							ref={provided.innerRef}
						>
							{pool.items.map((item, index) => (
								<Draggable key={item.id} draggableId={item.id} index={index}>
									{(provided) => (
										<AnnouncementComp announcement={item} provided={provided} />
									)}
								</Draggable>
							))}
							{provided.placeholder}
						</div>
					)}
				</Droppable>
			))}
		</DragDropContext >
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<AnnouncementsPanel />);

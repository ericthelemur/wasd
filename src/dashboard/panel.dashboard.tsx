import '../graphics/uwcs-bootstrap.css';

import React from 'react';
import {
    DragDropContext, Draggable, DropResult, Droppable, DroppableProvided
} from 'react-beautiful-dnd';
import { createRoot } from 'react-dom/client';
import { Announcement, Announcements } from 'types/schemas/announcements';
import { useReplicant } from 'use-nodecg';

function reorder(list: Announcement[], startIndex: number, endIndex: number) {
	const result = Array.from(list);
	const [removed] = result.splice(startIndex, 1);
	result.splice(endIndex, 0, removed);
	return result;
};

export function Panel() {
	var [announcements, setAnnouncements] = useReplicant<Announcements>("announcements", []);
	const [announcement, setAnnouncement] = useReplicant<Announcement>("announcement", { "id": "blank", "text": "", "repeat": false });
	if (announcements === undefined) return null;

	function onDragEnd(result: DropResult) {
		if (!result.destination) return;

		const items = reorder(announcements!, result.source.index, result.destination.index);
		announcements = items;
		setAnnouncements(items);
	}

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			<Droppable droppableId="droppable">
				{(provided) => (
					<div
						className='vstack p-2'
						{...provided.droppableProps}
						ref={provided.innerRef}
					>
						{announcements!.map((item, index) => (
							<Draggable key={item.id} draggableId={item.id} index={index}>
								{(provided) => (
									<div
										ref={provided.innerRef}
										{...provided.draggableProps}
										{...provided.dragHandleProps}
										className="card m-1"
									>
										<div className='card-body p-2'>
											{item.text}
										</div>
									</div>
								)}
							</Draggable>
						))}
						{provided.placeholder}
					</div>
				)}
			</Droppable>
		</DragDropContext>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<Panel />);

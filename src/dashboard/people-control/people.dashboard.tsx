import 'wasd-common/shared/uwcs-bootstrap.css';
import './people.scss';

import { useState } from 'react';
import { DragStart, DropResult } from 'react-beautiful-dnd';
import { PenFill } from 'react-bootstrap-icons';
import { createRoot } from 'react-dom/client';
import { Category, People, PeopleBank, Person } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
import { GroupProps, TwoColDnD } from 'wasd-common/shared/components/dndlist';

import { EditModal } from './editPerson';

function remove(src: Category, srcIndex: number) {
	if (!src) return;
	const newSrc = Array.from(src.people);
	const [r] = newSrc.splice(srcIndex, 1);
	src.people = newSrc;
	return r;
}

function add(item: string, dest: Category, destIndex: number) {
	if (!dest || dest.people.includes(item)) return;
	const newDest = Array.from(dest.people);
	newDest.splice(destIndex, 0, item);
	dest.people = newDest;
}

function reorder(list: Category, srcIndex: number, destIndex: number) {
	if (!list) return;

	const newList = Array.from(list.people);
	const [r] = newList.splice(srcIndex, 1);
	newList.splice(destIndex, 0, r);
	list.people = newList;
}


function newPerson(bank: PeopleBank) {
	const id = `person-${Date.now()}-${Math.trunc(Math.random() * 1000000)}`;
	bank![id] = { name: "", pronouns: "", socials: [{ id: "initial", "social": "unknown", "name": "" }] }
	return id;
}

function PersonContent({ id, person, onClick }: { id: string, person: Person, onClick: () => void }) {
	return <div className="editable input-group-text" onClick={onClick}>
		{person.name} <PenFill className="icon" />
	</div>
}

function onDragEnd({ source, destination }: DropResult, src: Category, dest: Category) {
	if (!destination) return;

	if (destination.droppableId === source.droppableId) {
		reorder(src, source.index, destination.index)
	} else if (destination.droppableId === "all") {
		remove(src, source.index);
	} else if (source.droppableId === "all") {
		add(src.people[source.index], dest, destination.index);
	} else {
		// Add first to be fail safe
		add(src.people[source.index], dest, destination.index);
		remove(src, source.index);
	}
}


export function PeoplePanel() {
	const [people,] = useReplicant<People>("people", { all: { name: "", people: [] } });
	const [peopleBank,] = useReplicant<PeopleBank>("peopleBank", {});
	const [editPerson, setEditPerson] = useState<string | null>(null);
	const [hv, setHover] = useState({ dragging: false, showBin: false });

	function genGroupArgs(gid: string, group: Category): GroupProps<Person> {
		return {
			title: group.name, id: gid,
			icon: group.icon,
			original: group.people, ids: group.people,
			data: group.people.map(id => peopleBank![id]),
		}
	}


	function content(gid: string, group: GroupProps<Person>, index: number, id: string, item: Person) {
		return <PersonContent id={id} person={item} onClick={() => setEditPerson(id)} />
	}
	function onHandle(gid: string, group: GroupProps<Person>, index: number, id: string | null, item: Person | null) {
		const newID = newPerson(peopleBank!);
		group.original.splice(index, 0, newID);
		if (group.id !== "all") people!.all.people.push(newID);
		setEditPerson(newID);
	}
	function fullRemove(id: string, item: Person) {
		if (confirm(`Remove ${item ? item.name : id} from all groups?`)) {
			console.log(id, item);
			Object.values(people!).forEach(g => g.people = g.people.filter(p => p !== id));
			delete peopleBank![id];
		}
	}
	function onRemove(gid: string, group: GroupProps<Person>, index: number, id: string | null, item: Person | null) {
		if (gid !== "all") group.original.splice(index, 1);
		else fullRemove(id!, item!);
	}
	function onBeforeDragStart(start: DragStart) {
		// Register drag start and show bin if dragging out of queue
		setHover({ dragging: true, showBin: start.source.droppableId !== "all" });
	}
	return <>
		{people && peopleBank && <TwoColDnD
			left={{
				cid: "pool", groups: [genGroupArgs("all", people.all)],
				functions: { content, onHandle, onRemove },
				showBin: hv.showBin
			}}
			right={{
				cid: "assignments",
				groups: Object.entries(people).filter(([gid, g]) => gid !== "all").map(([gid, group]) => genGroupArgs(gid, group)),
				functions: { content, onHandle, onRemove }
			}}
			onDragEnd={(r) => {
				setHover({ dragging: false, showBin: false });
				if (r.destination) onDragEnd(r, people![r.source.droppableId], people![r.destination.droppableId])
			}}
			onBeforeDragStart={onBeforeDragStart}
		/>}
		{editPerson && <EditModal editPerson={peopleBank![editPerson]} setEditPerson={setEditPerson} />}
	</>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

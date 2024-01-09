import 'wasd-common/shared/uwcs-bootstrap.css';
import './people.scss';

import { useState } from 'react';
import { DropResult } from 'react-beautiful-dnd';
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
	if (!dest) return;
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

function onDragEnd({ source, destination }: DropResult, people: People) {
	if (!destination) return;

	if (destination.droppableId !== source.droppableId) {
		const src = people![source.droppableId];
		const dest = people![destination.droppableId];
		// Add first to be fail safe
		add(src.people[source.index], dest, destination.index);
		remove(src, source.index);
	} else {
		const list = people![source.droppableId];
		reorder(list, source.index, destination.index)
	}
}


export function PeoplePanel() {
	const [people,] = useReplicant<People>("people", { all: { name: "", people: [] } });
	const [peopleBank,] = useReplicant<PeopleBank>("peopleBank", {});
	const [editPerson, setEditPerson] = useState<string | null>(null);

	function genGroupArgs(gid: string, group: Category) {
		return {
			title: group.name, id: gid,
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
		setEditPerson(newID);
	}
	function onRemove(gid: string, group: GroupProps<Person>, index: number, id: string | null, item: Person | null) {
		group.original.splice(index, 1)
	}
	return <>
		{people && peopleBank && <TwoColDnD
			left={{
				cid: "pool", groups: [genGroupArgs("all", people.all)],
				functions: { content, onHandle, onRemove }
			}}
			right={{
				cid: "assignments",
				groups: Object.entries(people).filter(([gid, g]) => gid !== "all").map(([gid, group]) => genGroupArgs(gid, group)),
				functions: { content, onHandle, onRemove }
			}}
			onDragEnd={(r) => onDragEnd(r, people)}
		/>}
		{editPerson && <EditModal editPerson={peopleBank![editPerson]} setEditPerson={setEditPerson} />}
	</>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

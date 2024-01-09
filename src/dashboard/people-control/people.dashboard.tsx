import 'wasd-common/shared/uwcs-bootstrap.css';
import './people.scss';

import { group } from 'console';
import { createContext, ReactElement, useContext, useState } from 'react';
import {
    DragDropContext, DraggableProvided, DroppableProvided, DropResult
} from 'react-beautiful-dnd';
import {
    At, DistributeVertical, GripVertical, PenFill, RecordFill, Wifi, X, XLg
} from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Stack from 'react-bootstrap/Stack';
import { createRoot } from 'react-dom/client';
import { Category, Icon, People, PeopleBank, Person, Social, Socials } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
import {
    DnDTransitionsList, GroupProps, InsertHandle, TwoColDnD
} from 'wasd-common/shared/components/dndlist';
import Editable from 'wasd-common/shared/components/editable';

function SocialIcon({ icon }: { icon: Icon }) {
	if (icon) {
		try {
			switch (icon.iconType) {
				case "svg":
					return <span dangerouslySetInnerHTML={{ __html: icon.icon }} />
			}
		} catch { }
	}
	return <span><At size="16px" /></span>
}

function SocialSelect({ social, setSocial }: { social: string, setSocial: (s: string) => void }) {
	const [socials,] = useReplicant<Socials>("socials", { "unknown": { "name": "Unknown", "iconType": "svg", "icon": "" } });
	var icon = socials![social];
	if (!icon) icon = socials!.unknown;
	return <Dropdown>
		<Dropdown.Toggle variant="outline-secondary">
			<SocialIcon icon={icon} />
		</Dropdown.Toggle>

		<Dropdown.Menu className="social-dropdown">
			{Object.entries(socials ?? {}).map(([s, icon]) =>
				<Dropdown.Item key={s} disabled={s === social} onClick={() => setSocial(s)}><SocialIcon icon={icon} /></Dropdown.Item>)}
		</Dropdown.Menu>
	</Dropdown>
}

const defaultSocial = () => ({ id: `social-${Date.now()}`, social: "unknown", name: "" })
function SocialComp({ soc, provided, onHandle, onRemove }: { soc: Social, provided: DraggableProvided, onHandle: () => void, onRemove: () => void }) {
	const { social, name } = soc;

	return <InputGroup className="m-1" ref={provided.innerRef} {...provided.draggableProps}>
		<div className="btn btn-outline-secondary" {...provided.dragHandleProps}>
			<GripVertical />
		</div>
		<InsertHandle onClick={onHandle} />

		<SocialSelect social={social} setSocial={(s) => { soc.social = s }} />
		<Editable className='msg-text' textClasses="input-group-text" text={name} setText={(v) => soc.name = v} type="multi" container={false} />
		<Button variant="outline-secondary" onClick={onRemove}><XLg /></Button>
	</InputGroup >
}

function EditModal({ editPerson, setEditPerson }: { editPerson: Person | null, setEditPerson: (p: string | null) => void }) {
	if (!editPerson) return <></>

	function onDragEnd(result: DropResult) {
		if (!result.destination || !editPerson) return;
		const [r] = editPerson.socials.splice(result.source.index, 1);
		if (r) editPerson.socials.splice(result.destination.index, 0, r);
		// reorder(editPerson.socials, result.source.index, result.destination.index);
	}

	return <Modal show={true} fullscreen="md-down" onHide={() => setEditPerson(null)}>
		<Modal.Header closeButton className="h4">Edit {editPerson.name}</Modal.Header>
		<Modal.Body>
			<Form>
				<Form.Group className="hstack gap-1">
					<Form.Label className="m-0 h6">Name: </Form.Label>
					<InputGroup>
						<Editable text={editPerson.name} setText={(v) => editPerson.name = v} type="single" />
					</InputGroup>
				</Form.Group>
				<hr className="my-2" />
				<Form.Group>
					<Form.Label className="h4 m-0">Socials:</Form.Label>
					<DragDropContext onDragEnd={onDragEnd}>
						<DnDTransitionsList id={"socials::" + editPerson.id} type={"socials::" + editPerson.id}
							ids={(editPerson.socials ?? []).map(s => editPerson.id + "::" + s.id)}
							data={editPerson.socials ?? []}
							content={(index, id, s, provided) => {
								return <SocialComp soc={s} provided={provided}
									onHandle={() => editPerson.socials.splice(index, 0, defaultSocial())}
									onRemove={() => editPerson.socials.splice(index, 1)} />
							}} />
					</DragDropContext>
					<div className="position-relative mt-2">
						<InsertHandle onClick={() => editPerson.socials.push(defaultSocial())} />
					</div>
				</Form.Group>
			</Form>
		</Modal.Body>
	</Modal>
}

function newPerson(bank: PeopleBank) {
	const id = `person-${Date.now()}-${Math.trunc(Math.random() * 1000000)}`;
	bank![id] = { name: "", socials: [] }
	return id;
}

function PersonContent({ id, person, onClick }: { id: string, person: Person, onClick: () => void }) {
	return <div className="editable input-group-text" onClick={onClick}>
		{person.name} <PenFill className="icon" />
	</div>
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

	function onDragEnd(result: DropResult) {
		if (!result.destination) return;

		if (result.destination.droppableId !== result.source.droppableId) {
			const src = people![result.source.droppableId];
			const dest = people![result.destination.droppableId];
			if (!src || !dest) return;

			const newSrc = Array.from(src.people);
			const newDest = Array.from(dest.people);
			const [r] = newSrc.splice(result.source.index, 1);
			newDest.splice(result.destination.index, 0, r);
			src.people = newSrc;
			dest.people = newDest;
		} else {
			const list = people![result.source.droppableId];
			if (!list) return;

			const newList = Array.from(list.people);
			const [r] = newList.splice(result.source.index, 1);
			newList.splice(result.destination.index, 0, r);
			list.people = newList;
		}
	}
	function content(gid: string, group: GroupProps<Person>, index: number, id: string, item: Person) {
		return <PersonContent id={id} person={item} onClick={() => setEditPerson(id)} />
	}
	function onHandle(gid: string, group: GroupProps<Person>, index: number, id: string | null, item: Person | null) {
		group.original.splice(index, 0, newPerson(peopleBank!))
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
			onDragEnd={onDragEnd}
		/>}
		{editPerson && <EditModal editPerson={peopleBank![editPerson]} setEditPerson={setEditPerson} />}
	</>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

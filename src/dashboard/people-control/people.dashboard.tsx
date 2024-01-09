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

interface PersonContext {
	person: Person | null;
	setEditPerson: (p: Person | null) => void;
}

function reorder<T>(list: T[], startIndex: number, endIndex: number) {
	const [removed] = list.splice(startIndex, 1);
	list.splice(endIndex, 0, removed);
	return list;
};

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

const defaultSocial = () => ({ id: `social-${Date.now()}`, social: "unknown", name: "" })
function SocialComp({ soc, provided, onHandle, onRemove }: { soc: Social, provided: DraggableProvided, onHandle: () => void, onRemove: () => void }) {
	const { social, name } = soc;
	const [socials,] = useReplicant<Socials>("socials", {});
	const icon = socials![social];

	return <InputGroup className="m-1" ref={provided.innerRef} {...provided.draggableProps}>
		<div className="btn btn-outline-secondary" {...provided.dragHandleProps}>
			<GripVertical />
		</div>
		<InsertHandle onClick={onHandle} />

		<Form.Select defaultValue={social} className="py-0" style={{ width: "7em", flexGrow: 0 }}>
			{Object.entries(socials!).map(([id, icon]) => <option key={id} value={id}>{icon.name}</option>)}
		</Form.Select>
		<Editable className='msg-text' textClasses="input-group-text" text={name} setText={(v) => soc.name = v} type="multi" container={false} />
		<Button variant="outline-secondary" onClick={onRemove}><XLg /></Button>
	</InputGroup >
}


function EditModal({ editPerson, setEditPerson }: { editPerson: Person | null, setEditPerson: (p: Person | null) => void }) {
	if (editPerson === null) return <></>

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
					<DnDTransitionsList id={"socials::" + editPerson.id} type={"socials::" + editPerson.id}
						ids={(editPerson.socials ?? []).map(s => editPerson.id + "::" + s.id)}
						data={editPerson.socials ?? []}
						content={(index, id, s, provided) => {
							return <SocialComp soc={s} provided={provided}
								onHandle={() => editPerson.socials.splice(index, 0, defaultSocial())}
								onRemove={() => editPerson.socials.splice(index, 1)} />
						}} />
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

export function PeoplePanel() {
	const [people,] = useReplicant<People>("people", { all: { name: "", people: [] } });
	const [peopleBank,] = useReplicant<PeopleBank>("peopleBank", {});
	const [editPerson, setEditPerson] = useState<Person | null>(null);

	function genGroupArgs(gid: string, group: Category) {
		return {
			title: group.name, id: gid,
			original: group.people, ids: group.people,
			data: group.people.map(id => peopleBank![id]),
		}
	}

	function onDragEnd(result: DropResult) {
		// if (!result.destination) return;
		// if (result.type === "people") {
		// 	reorder(people!, result.source.index, result.destination.index);
		// } else if (editPerson && result.type.startsWith("socials::")) {
		// 	reorder(editPerson.socials, result.source.index, result.destination.index);
		// }
	}
	console.log("DATA2", people, peopleBank, people!.all.people.map(id => peopleBank![id]));
	function content(gid: string, group: GroupProps<Person>, index: number, id: string, item: Person) {
		return <div className="editable input-group-text" onClick={() => setEditPerson(item)}>
			{item.name} <PenFill className="icon" />
		</div>
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
		{editPerson && <EditModal editPerson={editPerson} setEditPerson={setEditPerson} />}
	</>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

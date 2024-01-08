import 'wasd-common/shared/uwcs-bootstrap.css';
import './people.scss';

import { useState } from 'react';
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
import { Icon, People, Person, Social, Socials } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
import { DnDTransitionsList } from 'wasd-common/shared/components/dndlist';
import Editable from 'wasd-common/shared/components/editable';

import add from '../assets/add.svg';

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

interface PersonProps {
	person: Person;
	provided: DraggableProvided;
	onHandle: () => void;
	setEditPerson: (p: Person) => void;
	onRemove: () => void;
}

function PersonComp({ person, provided, onHandle, setEditPerson, onRemove }: PersonProps) {
	const { name, socials } = person;
	return <InputGroup className="person h4 m-1" ref={provided.innerRef} {...provided.draggableProps}>
		<div className="btn btn-outline-secondary" {...provided.dragHandleProps}>
			<GripVertical />
		</div>
		<InsertHandle onClick={onHandle} />
		<div className="editable input-group-text" onClick={() => setEditPerson(person)}>
			{name} <PenFill className="icon" />
		</div>
		<Button variant="outline-secondary py-0 px-1" onClick={onRemove}><XLg /></Button>
	</InputGroup>
}

function EditModal({ person, setEditPerson }: { person: Person, setEditPerson: (p: Person | null) => void }) {
	return <Modal show={true} fullscreen="md-down" onHide={() => setEditPerson(null)}>
		<Modal.Header closeButton className="h4">Edit {person.name}</Modal.Header>
		<Modal.Body>
			<Form>
				<Form.Group className="hstack gap-1">
					<Form.Label className="m-0 h6">Name: </Form.Label>
					<InputGroup>
						<Editable text={person.name} setText={(v) => person.name = v} type="single" />
					</InputGroup>
				</Form.Group>
				<hr className="my-2" />
				<Form.Group>
					<Form.Label className="h4 m-0">Socials:</Form.Label>
					<DnDTransitionsList id={"socials::" + person.id} type={"socials::" + person.id}
						ids={(person.socials ?? []).map(s => person.id + "::" + s.id)}
						data={person.socials ?? []}
						content={(id, index, s, provided) => {
							return <SocialComp soc={s} provided={provided}
								onHandle={() => person.socials.splice(index, 0, defaultSocial())}
								onRemove={() => person.socials.splice(index, 1)} />
						}} />
					<div className="position-relative mt-2">
						<InsertHandle onClick={() => person.socials.push(defaultSocial())} />
					</div>
				</Form.Group>
			</Form>
		</Modal.Body>
	</Modal>
}

function InsertHandle(props: { onClick: () => void }) {
	return (
		<div className="addBtn" onClick={props.onClick}>
			<img className="addIcon" src={add} />
		</div>
	)
}

const defaultPerson = () => { return { id: `person-${Date.now()}`, name: "New", socials: [] } };
export function PeoplePanel() {
	const [people,] = useReplicant<People>("people", []);
	const [editPerson, setEditPerson] = useState<Person | null>(null);

	function onDragEnd(result: DropResult) {
		if (!result.destination) return;
		if (result.type === "people") {
			reorder(people!, result.source.index, result.destination.index);
		} else if (editPerson && result.type.startsWith("socials::")) {
			reorder(editPerson.socials, result.source.index, result.destination.index);
		}
	}

	return <DragDropContext onDragEnd={onDragEnd}>
		<Stack className="m-2">
			<DnDTransitionsList id={"people"} type="people"
				ids={(people ?? []).map(p => p.id)}
				data={people ?? []}
				content={(id, index, p, provided) => {
					return <PersonComp person={p} provided={provided}
						setEditPerson={(p) => setEditPerson(p)}
						onHandle={() => people!.splice(index, 0, defaultPerson())}
						onRemove={() => people!.splice(index, 1)} />
				}} />
			<div className="position-relative mt-2">
				<InsertHandle onClick={() => people!.push(defaultPerson())} />
			</div>
		</Stack>
		{editPerson && <EditModal person={editPerson} setEditPerson={(p) => setEditPerson(p)} />}
	</DragDropContext>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

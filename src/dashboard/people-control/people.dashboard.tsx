import 'wasd-common/shared/uwcs-bootstrap.css';
import './people.scss';

import { useState } from 'react';
import { DragDropContext, DraggableProvided, DroppableProvided } from 'react-beautiful-dnd';
import {
    At, DistributeVertical, GripVertical, PenFill, RecordFill, Wifi
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
	const result = Array.from(list);
	const [removed] = result.splice(startIndex, 1);
	result.splice(endIndex, 0, removed);

	return result;
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

function SocialComp({ soc, provided }: { soc: Social, provided: DraggableProvided }) {
	const { social, name } = soc;
	const [socials,] = useReplicant<Socials>("socials", {});
	const icon = socials![social];

	return <InputGroup className="m-1" ref={provided.innerRef} {...provided.draggableProps}>
		<div className="btn btn-outline-secondary" {...provided.dragHandleProps}>
			<GripVertical />
		</div>

		<div className="btn btn-outline-secondary" >
			<SocialIcon icon={icon} />
		</div>
		<Editable className='msg-text' textClasses="input-group-text" text={name} setText={(v) => soc.name = v} type="multi" container={false} />
	</InputGroup>
}

interface PersonProps {
	person: Person;
	provided: DraggableProvided;
	onHandle: () => {};
	setEditPerson: (p: Person) => {};
}

function PersonComp({ person, provided, onHandle, setEditPerson }: PersonProps) {
	const { name, socials } = person;
	return <Card ref={provided.innerRef} {...provided.draggableProps} className="m-1">
		<InsertHandle onClick={onHandle} />
		<Stack direction="horizontal" className="gap-1 person h-4">
			<div {...provided.dragHandleProps} className="px-1">
				<GripVertical />
			</div>
			<div className="flex-grow-1 editable lh-1" onClick={() => setEditPerson(person)}>
				{name} <PenFill className="icon" />
			</div>
		</Stack>
	</Card>
}

function EditModal({ person, setEditPerson }: { person: Person, setEditPerson: (p: Person | null) => {} }) {
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
					<DnDTransitionsList id={"socials::" + name} type={"socials::" + name}
						ids={(person.socials ?? []).map(s => name + "::" + s.name)}
						data={person.socials ?? []}
						content={(id, index, s, provided) => {
							return <SocialComp soc={s} provided={provided} />
						}} />
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

export function PeoplePanel() {
	const [people,] = useReplicant<People>("people", []);
	const [editPerson, setEditPerson] = useState<Person | null>(null);
	return <DragDropContext onDragEnd={() => { }}>
		<Stack className="m-2">
			<DnDTransitionsList id={"people"} type="people"
				ids={(people ?? []).map(p => p.name)}
				data={people ?? []}
				content={(id, index, p, provided) => {
					return <PersonComp person={p} provided={provided}
						setEditPerson={setEditPerson}
						onHandle={() => people?.splice(index, 0, { name: "New", socials: [] })} />
				}} />
		</Stack>
		{editPerson && <EditModal person={editPerson} setEditPerson={setEditPerson} />}
	</DragDropContext>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

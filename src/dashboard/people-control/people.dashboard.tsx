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

// interface PersonProps {
// 	person: Person;
// 	provided: DraggableProvided;
// 	onHandle?: () => void;
// 	onRemove: () => void;
// }

// function PersonWrapper(props: PersonProps) {
// 	const { person, provided, onHandle, onRemove } = props;
// 	return <InputGroup className="person h4 m-1" ref={provided.innerRef} {...provided.draggableProps}>
// 		<div className="btn btn-outline-secondary" {...provided.dragHandleProps}>
// 			<GripVertical />
// 		</div>
// 		{onHandle && <InsertHandle onClick={onHandle} />}
// 		{(props as any).children}
// 		<Button variant="outline-secondary py-0 px-1" onClick={onRemove}><XLg /></Button>
// 	</InputGroup>
// }

// function PersonComp(props: PersonProps) {
// 	const { setEditPerson } = useContext(EditPersonContext);

// 	return <PersonWrapper {...props}>{!props.person ? "Unknown Person" :
// 		<div className="editable input-group-text" onClick={() => setEditPerson(props.person)}>
// 			{props.person.name} <PenFill className="icon" />
// 		</div>
// 	}</PersonWrapper>
// }

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

// interface CategoryProps {
// 	id: string
// 	category: Category,
// 	bank: PeopleBank,
// }

// function CategoryComp({ id, category, bank }: CategoryProps) {
// 	return <div>
// 		<h2>{category.name}</h2>
// 		<Stack className="m-2">
// 			<DnDTransitionsList id={`people::${id}`} type="people"
// 				ids={category.people.map(pid => `${id}::${pid}`)}
// 				data={category.people.map(pid => bank[pid])}
// 				content={(id, index, p, provided) => {
// 					return <PersonComp person={p} provided={provided}
// 						onHandle={() => category.people.splice(index, 0, newPerson(bank))}
// 						onRemove={() => category.people.splice(index, 1)} />
// 				}} />
// 			<div className="position-relative mt-2">
// 				<InsertHandle onClick={() => category.people.push(newPerson(bank))} />
// 			</div>
// 		</Stack>
// 	</div>
// }

export function PeoplePanel() {
	const [people,] = useReplicant<People>("people", { all: { name: "", people: [] } });
	const [peopleBank,] = useReplicant<PeopleBank>("peopleBank", {});
	const [editPerson, setEditPerson] = useState<Person | null>(null);

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
		{people && peopleBank && <TwoColDnD left={{
			cid: "pool", groups: [
				{
					title: "All", id: "all",
					original: people.all.people, ids: people.all.people,
					data: people.all.people.map(id => peopleBank[id]),
				}],
			functions: { content, onHandle, onRemove }
		}}
			right={{ cid: "assignments", groups: [], functions: { content, onHandle, onRemove } }}
			onDragEnd={onDragEnd}
		/>}
		{/* {people && peopleBank && <DragDropContext onDragEnd={onDragEnd}>
			<div className='fill'>
				<div className='w-50 h-100 overflow-auto'>
					<CategoryComp id="all" category={{ name: "All", people: Object.keys(peopleBank) }} bank={peopleBank} />
				</div>
				<div className='w-50 h-100 overflow-auto'>
					{Object.entries(people).map(([id, cat]) =>
						<CategoryComp key={id} id={id} category={cat} bank={peopleBank} />
					)}
				</div>
			</div>
			{editPerson && <EditModal />}
		</DragDropContext>} */}
		{editPerson && <EditModal editPerson={editPerson} setEditPerson={setEditPerson} />}
	</>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

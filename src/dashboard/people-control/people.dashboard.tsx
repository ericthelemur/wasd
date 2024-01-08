import 'wasd-common/shared/uwcs-bootstrap.css';
import './people.scss';

import { useState } from 'react';
import { DragDropContext, DraggableProvided, DroppableProvided } from 'react-beautiful-dnd';
import { At, DistributeVertical, GripVertical, RecordFill, Wifi } from 'react-bootstrap-icons';
import Accordion from 'react-bootstrap/Accordion';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import InputGroup from 'react-bootstrap/InputGroup';
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

	return <Stack direction="horizontal" gap={1} ref={provided.innerRef} {...provided.draggableProps}>
		<div {...provided.dragHandleProps}>
			<GripVertical />
		</div>
		<SocialIcon icon={icon} />
		<Editable text={name} setText={(v) => soc.name = v} type="multi" />
	</Stack>
}

function PersonComp({ person, provided, onHandle }: { person: Person, provided: DraggableProvided, onHandle: () => {} }) {
	const { name, socials } = person;
	return <Accordion.Item ref={provided.innerRef} {...provided.draggableProps} eventKey={name}>
		<Accordion.Header>
			<InsertHandle onClick={onHandle} />
			<Stack direction="horizontal" className="gap-1 person">
				<div {...provided.dragHandleProps}>
					<GripVertical />
				</div>
				<Editable text={name} setText={(v) => person.name = v} type="multi" />
			</Stack>
		</Accordion.Header>
		<Accordion.Body>
			<DnDTransitionsList id={"socials::" + name} type={"socials::" + name}
				ids={(socials ?? []).map(s => name + "::" + s.name)}
				data={socials ?? []}
				content={(id, index, s, provided) => {
					return <SocialComp soc={s} provided={provided} />
				}} />
		</Accordion.Body>
	</Accordion.Item>
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
	return <DragDropContext onDragEnd={() => { }}>
		<Accordion className="m-2">
			<DnDTransitionsList id={"people"} type="people"
				ids={(people ?? []).map(p => p.name)}
				data={people ?? []}
				content={(id, index, p, provided) => {
					return <PersonComp person={p} provided={provided} onHandle={() => people?.splice(index, 0, { name: "New", socials: [] })} />
				}} />
		</Accordion>
	</DragDropContext>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

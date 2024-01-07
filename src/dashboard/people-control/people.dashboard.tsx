import 'wasd-common/shared/uwcs-bootstrap.css';
import './people.scss';

import { At, RecordFill, Wifi } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import { createRoot } from 'react-dom/client';
import { Icon, People, Person, Social, Socials } from 'types/schemas';
import { useReplicant } from 'use-nodecg';
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
	return <At size="16px" />
}

function SocialComp({ soc }: { soc: Social }) {
	const { social, name } = soc;
	const [socials,] = useReplicant<Socials>("socials", {});
	const icon = socials![social];

	return <Stack gap={2} direction="horizontal">
		<SocialIcon icon={icon} />
		<InputGroup><Editable text={name} setText={(v) => soc.name = v} /></InputGroup>
	</Stack>
}

function PersonComp({ person }: { person: Person }) {
	const { name, socials } = person;
	return <Card className="m-2 p-2">
		<h4><InputGroup><Editable text={name} setText={(v) => person.name = v} /></InputGroup></h4>
		{<Stack gap={1} className="mx-2">
			{socials?.map(s => <SocialComp soc={s} />)}
		</Stack>}
	</Card>
}

export function PeoplePanel() {
	const [people,] = useReplicant<People>("people", []);
	return <Stack>
		{people?.map(p => <PersonComp person={p} />)}
	</Stack>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

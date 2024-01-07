import 'wasd-common/shared/uwcs-bootstrap.css';
import './people.scss';

import { At, RecordFill, Wifi } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
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
	return <At size="1em" />
}

function SocialComp({ soc }: { soc: Social }) {
	const { social, name } = soc;
	const [socials,] = useReplicant<Socials>("socials", {});
	const icon = socials![social];

	return <Stack gap={3} direction="horizontal">
		<SocialIcon icon={icon} />
		<Editable text={name} setText={(v) => soc.name = v} />
	</Stack>
}

function PersonComp({ person }: { person: Person }) {
	const { name, socials } = person;
	return <div>
		<Editable text={name} setText={(v) => person.name = v} />
		{<Stack gap={3}>
			{socials?.map(s => <SocialComp soc={s} />)}
		</Stack>}
	</div>
}

export function PeoplePanel() {
	const [people,] = useReplicant<People>("people", []);
	return <Stack>
		{people?.map(p => <PersonComp person={p} />)}
	</Stack>
}

const root = createRoot(document.getElementById('root')!);
root.render(<PeoplePanel />);

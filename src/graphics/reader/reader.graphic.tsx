import '../uwcs-bootstrap.css';
import './reader.graphic.css';

import { useState } from 'react';
import Container from 'react-bootstrap/Container';
import { createRoot } from 'react-dom/client';

import { Settings, SortSettings } from './components/settings';
import { AllDonations, Donors, LiveDonations } from './components/donolists';


export function Reader() {
	const defaultSettings: SortSettings = { list: "live", sort: "money", dir: "asc", show: ["unread", "approved", "undecided"] };
	const [sortSettings, setSortSettings] = useState(defaultSettings);
	console.log(sortSettings);

	var donos = <></>;
	const args = { sortSettings: sortSettings, setSortSettings: setSortSettings };
	if (sortSettings.list === "all") donos = <AllDonations {...args} />;
	else if (sortSettings.list === "donors") donos = <Donors {...args} />;
	else donos = <LiveDonations {...args} />;

	return (
		<Container fluid="xxl">
			<Settings settings={sortSettings} setSettings={setSortSettings} />
			<h1 className="mt-3">Tiltify Donation Reader</h1>
			{donos}
		</Container>
	)
}

const root = createRoot(document.getElementById('root')!);
root.render(<Reader />);
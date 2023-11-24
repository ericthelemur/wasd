import '../uwcs-bootstrap.css';
import './reader.graphic.css';

import { useState } from 'react';
import Container from 'react-bootstrap/Container';
import { createRoot } from 'react-dom/client';

import { Settings, SortSettings } from './components/settings';
import { AllDonations, Donors, LiveDonations } from './components/donolists';
import { Incentives } from './components/incentives';


export const defaultSettings: SortSettings = { list: "live", sort: "money", dir: "asc", show: ["unread", "approved", "undecided"] };

function fetchFromParams() {
	const url = new URL(window.location.href);
	var params = url.searchParams;
	var settings = { ...defaultSettings };

	for (var [k, v] of params) {
		if (k === "list" || k === "sort" || k === "dir") settings[k] = v;
		else if (k === "show") settings[k] = v.split(",");
	}
	return settings;
}

function copyToParams(settings: SortSettings) {
	const url = new URL(window.location.href);
	var params = url.searchParams;
	Object.entries(settings).forEach(([k, v]) => params.set(k, v.toString()));
    history.replaceState(null, "", url.href);
}


export function Reader() {
	const [sortSettings, setSortSettings] = useState(fetchFromParams());
	copyToParams(sortSettings);
	console.log(sortSettings);

	var donos = <></>;
	const args = { sortSettings: sortSettings, setSortSettings: setSortSettings };
	// Pick page to render
	if (sortSettings.list === "all") donos = <AllDonations {...args} />;
	else if (sortSettings.list === "donors") donos = <Donors {...args} />;
	else if (sortSettings.list === "incentives") donos = <Incentives />;
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
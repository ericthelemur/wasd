import 'wasd-common/shared/uwcs-bootstrap.css';
import './reader.graphic.css';

import { useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import { createRoot } from 'react-dom/client';

import { AllDonations, Donors, LiveDonations } from './components/donolists';
import * as icons from './components/icons';
import { Incentives } from './components/incentives';
import { Settings, SortSettings, TabSetting } from './components/settings';

export const defaultSettings: SortSettings = { list: "live", sort: "time", dir: "dsc", show: ["unread", "approved", "undecided"] };

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
	useEffect(() => {
		copyToParams(sortSettings);
	}, [sortSettings]);

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
			<TabSetting name="list" labels={true} current={sortSettings.list}
				options={[icons.live, icons.all, icons.donors, icons.incentives]}
				onclick={(v) => setSortSettings({ ...sortSettings, list: v })}
			/>
			<br />
			{donos}
		</Container>
	)
}

const root = createRoot(document.getElementById('root')!);
root.render(<Reader />);
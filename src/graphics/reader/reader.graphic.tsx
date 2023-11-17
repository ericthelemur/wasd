import '../uwcs-bootstrap.css';
import './reader.graphic.css';

import { Donation as DonationT, Donations } from 'nodecg-tiltify/src/types/schemas/donations';
import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import { createRoot } from 'react-dom/client';
import { useReplicant } from 'use-nodecg';

import { Donation } from './components/donation';
import { Settings, SortSettings } from './components/settings';

export function Reader() {
	const [d, setDonos] = useReplicant<Donations>("donations", [], { namespace: "nodecg-tiltify" });
	const donos = d === undefined ? [] : d;
	console.log("Rerendering", donos);

	const defaultSettings: SortSettings = { sort: "money", dir: "asc", show: ["unread", "approved", "undecided"] };
	const [sortSettings, setSortSettings] = useState(defaultSettings);
	console.log(sortSettings);

	const sortedDonos = [...donos].sort((a: DonationT, b: DonationT) => {
		const va = sortSettings.sort === "money" ? a.amount.value : b.completed_at;
		const vb = sortSettings.sort === "money" ? b.amount.value : a.completed_at;
		var result = (va < vb) ? -1 : (va > vb) ? 1 : 0;
		return result * (sortSettings.dir === "asc" ? 1 : -1);
	})

	return (
		<Container fluid="xxl">
			<Settings settings={sortSettings} setSettings={setSortSettings} />
			<h1 className="mt-3">Tiltify Donation Reader</h1>
			<div id="donations" className="donations">
				{sortedDonos.map((d: DonationT) => <Donation key={d.id} dono={d} />)}
			</div>
		</Container>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<Reader />);
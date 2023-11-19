import '../uwcs-bootstrap.css';
import './reader.graphic.css';

import { Alldonations, Basedono } from 'nodecg-tiltify/src/types/schemas/alldonations';
import { Donation as DonationT, Donations } from 'nodecg-tiltify/src/types/schemas/donations';
import { Donors } from 'nodecg-tiltify/src/types/schemas/donors';
import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import { createRoot } from 'react-dom/client';
import { useReplicant } from 'use-nodecg';

import { Donation } from './components/donation';
import { Settings, SortSettings } from './components/settings';
import { APPROVED, CENSORED, UNDECIDED } from 'nodecg-tiltify/src/extension/utils/mod';

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


interface DonoListProps {
	sortSettings: SortSettings;
	setSortSettings: React.Dispatch<React.SetStateAction<SortSettings>>;
}

interface SortedDonosProps extends DonoListProps {
	donos: Basedono[] | DonationT[];
}

export function LiveDonations(props: DonoListProps) {
	const [d, setDonos] = useReplicant<Donations>("donations", [], { namespace: "nodecg-tiltify" });
	const donos = d === undefined ? [] : d;
	return <SortedDonations donos={donos} {...props} />
}

export function AllDonations(props: DonoListProps) {
	const [d, setDonos] = useReplicant<Alldonations>("alldonations", [], { namespace: "nodecg-tiltify" });
	const donos = d === undefined ? [] : d;
	return <SortedDonations donos={donos} {...props} />
}

export function Donors(props: DonoListProps) {
	const [d, setDonos] = useReplicant<Donations>("donations", [], { namespace: "nodecg-tiltify" });
	const donos = d === undefined ? [] : d;
	return <SortedDonations donos={donos} {...props} />
}

export function SortedDonations({ donos, sortSettings, setSortSettings }: SortedDonosProps) {
	if (!donos || !donos[0]) return <></>;
	if ("read" in donos[0]) {
		donos = (donos as DonationT[]).filter((d) => {
			return ((sortSettings.show.includes("read") && d.read) || (sortSettings.show.includes("unread") && !d.read)) &&
				((sortSettings.show.includes("approved") && d.modStatus === APPROVED) || 
				  (sortSettings.show.includes("undecided") && d.modStatus === UNDECIDED) || 
				  (sortSettings.show.includes("censored") && d.modStatus === CENSORED))
		})
	} else {
		donos = [...donos]
	}
	const sortedDonos = donos
		.sort((a: Basedono, b: Basedono) => {
			const va = sortSettings.sort === "money" ? a.amount.value : b.completed_at;
			const vb = sortSettings.sort === "money" ? b.amount.value : a.completed_at;
			var result = (va < vb) ? -1 : (va > vb) ? 1 : 0;
			return result * (sortSettings.dir === "asc" ? 1 : -1);
		})

	return (
		<div className="donations">
			{sortedDonos.map((d) => <Donation key={d.id} dono={d as unknown as DonationT} />)}
		</div>
	)
}

const root = createRoot(document.getElementById('root')!);
root.render(<Reader />);
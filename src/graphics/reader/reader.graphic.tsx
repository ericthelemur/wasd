import '../uwcs-bootstrap.css';
import './reader.graphic.css';

import { Donation as DonationT, Donations } from 'nodecg-tiltify/src/types/schemas/donations';
import React from 'react';
import Container from 'react-bootstrap/Container';
import { createRoot } from 'react-dom/client';
import { useReplicant } from 'use-nodecg';

import { Donation } from './components/donation';

export function Reader() {
	const [donos, setDonos] = useReplicant<Donations>("donations", [], { namespace: "nodecg-tiltify" });
	console.log("Rerendering", donos);

	return (
		<Container fluid="xxl">
			<h1 className="mt-3">Tiltify Donation Reader</h1>
			<div id="donations" className="donations">
				{donos?.map((d: DonationT) => <Donation key={d.id} dono={d} />)}
			</div>
		</Container>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<Reader />);
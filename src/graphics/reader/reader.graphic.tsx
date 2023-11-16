import React from 'react';
import { createRoot } from 'react-dom/client';
import { useReplicant } from 'use-nodecg';

import "../uwcs-bootstrap.css";
import "./reader.graphic.css";
import { Donation } from './components/donation';
import { Donations } from "~nodecg-tiltify/src/types/schemas/donations";
import Container from "react-bootstrap/Container";

export function Reader() {
	const [donos, setDonos] = useReplicant<Donations>("donations", [], { namespace: "nodecg-tiltify" });

	return (
		<Container fluid="xxl">
			<h1 className="mt-3">Tiltify Donation Reader</h1>
			<div id="donations" className="donations">
				{donos?.map(d => <Donation dono={d} />)}
			</div>
		</Container>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<Reader />);
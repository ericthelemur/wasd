import React from 'react';
import { useReplicant } from 'use-nodecg';
import { ExampleReplicant } from '../types/schemas';

export function Panel() {
	const [ex, setEx] = useReplicant<ExampleReplicant>("exampleReplicant", { "firstName": "First", "lastName": "Last", "age": 0 });
	console.log(ex);
	return (
		<>
			<p>Hello, I'm one of the panels in your bundle! I'm where you put your controls.</p>

			<p>{ex?.age}</p>
		</>
	)
}

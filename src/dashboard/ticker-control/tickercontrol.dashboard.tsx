import 'wasd-common/shared/uwcs-bootstrap.css';

import { klona } from 'klona';
import { createRef, useEffect, useState } from 'react';
import { DragDropContext, DraggableLocation, DragStart, DropResult } from 'react-beautiful-dnd';
import { Pause, Play, PlusLg, Trash } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import { createRoot } from 'react-dom/client';
import { useReplicant } from 'use-nodecg';

import NodeCG from '@nodecg/types';

import { sendTo, sendToF } from '../../common/listeners';
import {
    Bank, Configschema, Current, Message, MsgRef, Pool, Pools, Queue
} from '../../types/schemas';
import { PoolComp } from './components/msgpool';

declare const nodecg: NodeCG.ClientAPI<Configschema>;

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "numeric", second: "numeric" });

interface HoverStates {
	dragging: boolean;
	hoverQueue: boolean;
	showBin: boolean;
}

export interface PreludeInfo {
	lastCA: MsgRef | null;
	prelude: MsgRef[];
	length: number;
}

function sendDragAndDropMove(source: DraggableLocation, destination: DraggableLocation, queue: Queue, pools: Pools, preludeLength: number) {
	if (source.droppableId !== "queue" && destination.droppableId !== "queue") {
		// Moving pools (pool to pool)
		if (source.index === destination.index) return;
		const da = pools![destination.droppableId].msgs;
		// Adjust for removal of old changing index of drop location
		const ind = source.droppableId === destination.droppableId && source.index < destination.index ? destination.index + 1 : destination.index;
		sendTo("movePool", {
			aref: klona(pools![source.droppableId].msgs[source.index]),
			oldpid: source.droppableId,
			newpid: destination.droppableId,
			before: klona(destination.index === da.length ? null : da[ind])
		})
	} else if (source.droppableId === "queue" && destination.droppableId === "queue") {
		sendTo("reorderQueue", { // Reordering queue elements (queue to queue)
			aref: queue!.msgs[source.index - preludeLength],
			before: queue!.msgs[destination.index - preludeLength]
		});
	} else if (source.droppableId !== "queue" && destination.droppableId === "queue") {
		sendTo("enqueue", { // Adding to queue (pool to queue)
			mid: pools![source.droppableId].msgs[source.index].id,
			before: queue!.msgs[destination.index - preludeLength]
		})
	} else { // (source.droppableId === "queue" && destination.droppableId !== "queue")
		// Removing from queue (queue to pool)
		sendTo("dequeue", { aref: queue!.msgs[source.index - preludeLength] })
	}
}

function CurrentMsg({ current }: { current: Current }) {
	return <>
		<h3>Current</h3>
		<div className="card message m-1">
			<div className="card-body hstack gap-2">
				<span className="flex-grow-1 line-clamp-1">
					{current.text}
				</span>
				<span className="flex-shrink-0">
					{current.pause ? "paused" : `until ${timeFormat.format(current.endTime)}`}
				</span>
			</div>
		</div>
	</>
}

function Pools({ pools, bank, showBin }: { pools: Pools, bank: Bank, showBin: boolean }) {
	return <div className="vstack w-50">
		<h2>Messages Pools</h2>
		<Button className="d-inline" onClick={sendToF("addPool", {})}><PlusLg /> Add Pool</Button>
		<div className="pools overflow-auto vstack gap-3 p-2">
			{Object.entries(pools).map(([pid, pool]) => {
				if (pool === undefined) return <h3 key={pid}>Error: Corresponding Pool does not exist for pool id {pid}</h3>
				const contents = pool.msgs.map(mid => bank![mid.id]);
				return <PoolComp id={pid} key={pid} pool={pool} contents={contents} />
			})}
			{showBin && <div className="trash"><Trash className="queue-trash" /></div>}
		</div>
	</div>
}

function BarIframe() {
	const iframeRef = createRef<HTMLIFrameElement>();
	const parRef = createRef<HTMLDivElement>();
	const [scale, setScale] = useState(1.0);
	useEffect(() => {
		const interval = setInterval(() => {
			if (!parRef.current) return;
			const newScale = parRef.current.offsetWidth / 1920.0;
			if (newScale != scale) setScale(newScale);
		}, 100);
		return () => clearInterval(interval);
	})
	return <div ref={parRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left" }} className='w-100 overflow-none'>
		<iframe ref={iframeRef} src={nodecg.bundleConfig.barURL} height="70" width="1920" className="sticky-top" />
	</div>
}

const defaultPrelude = () => ({ lastCA: null, prelude: [], length: 0 });
export function MsgControlPanel() {
	const [hv, setHover] = useState<HoverStates>({ dragging: false, hoverQueue: false, showBin: false });
	const [prelude, setPrelude] = useState<PreludeInfo>(defaultPrelude());

	const [pools,] = useReplicant<Pools>("pools", {});
	const [bank,] = useReplicant<Bank>("bank", {});
	const [queue,] = useReplicant<Queue>("queue", { "name": "Queue", "priority": 0, "msgs": [] });
	const [current,] = useReplicant<Current>("current", { "text": "", "msgID": null, "endTime": 0 });
	// console.log(pools);
	if (!pools) return <h2>Not loaded messages</h2>;

	// Maintain prelude list
	if ((hv.dragging || hv.hoverQueue) && current !== undefined && current.text !== "") {
		if (prelude.length === 0) {
			console.log("Setting length", queue!.msgs.length);
			setPrelude({ ...prelude, length: queue!.msgs.length });
		}
		if (prelude.lastCA === null) {	// Record current message as last if just started
			setPrelude({ ...prelude, lastCA: { id: current.msgID!, time: current.time } });
		} else if (prelude.prelude.length > queue!.msgs.length / 2) {
			setPrelude({ ...prelude, prelude: [] });	// Clear prelude if half of queue
		} else if (prelude.lastCA.id != current.msgID && prelude.lastCA.time != current.time) {
			// Add new message to prelude
			const lca = { id: current.msgID!, time: current.time };
			setPrelude({ ...prelude, lastCA: lca, prelude: [...prelude.prelude, lca] });
		}
	}
	// Reset prelude on dragging stop
	if (!hv.dragging && !hv.hoverQueue && prelude.prelude.length > 0) setPrelude(defaultPrelude());


	function onBeforeDragStart(start: DragStart) {
		// Register drag start and show bin if dragging out of queue
		setHover({ ...hv, dragging: true, showBin: start.source.droppableId === "queue" });
	}

	function onDragEnd(result: DropResult) {
		// Reset bin + prelude
		setHover({ ...hv, dragging: false, showBin: false });
		setPrelude(defaultPrelude());

		// Trigger correct effect of the move
		const { source, destination } = result;
		if (!destination) return;
		sendDragAndDropMove(source, destination, queue!, pools!, prelude.prelude.length);
	}

	// Fetch current message object from message bank
	const currentMsg = bank && current && current.msgID ? bank[current.msgID] : undefined;

	const queueContents = queue!.msgs.map(mid => bank![mid.id]);
	const queuePreludeMsgs = prelude.prelude.map(mid => bank![mid.id]);
	return (
		<div className="vstack" style={{ height: "100vh" }}>
			<div className='container-xxl h-0 flex-grow-1'>
				<BarIframe />
				<DragDropContext onDragEnd={onDragEnd} onBeforeDragStart={onBeforeDragStart}>
					<div className='d-flex gap-3 h-100'>
						<div className="w-50 overflow-auto sticky-top">
							{current && currentMsg && (<div className="p-2">
								<InputGroup className="card-ctrls message float-end">
									<Button variant="outline-primary" onClick={() => current.pause = !current.pause}>{current.pause ? <Play /> : <Pause />}</Button>
								</InputGroup>
								<CurrentMsg current={current} />
							</div>)}
							{queue && (<div className="p-2" onMouseEnter={() => setHover({ ...hv, hoverQueue: true })} onMouseLeave={() => setHover({ ...hv, hoverQueue: false })}>
								<h3>Queue</h3>
								<PoolComp id="queue" pool={queue} contents={queueContents} preludeInfo={prelude} prelude={queuePreludeMsgs} />
							</div>)}
						</div>
						<Pools pools={pools} bank={bank!} showBin={hv.showBin} />
					</div>
				</DragDropContext >
			</div>
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<MsgControlPanel />);

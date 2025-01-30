import { APPROVED, CENSORED, UNDECIDED } from 'tiltify/extension/utils/mod';
import { Alldonations, Basedono, Donation, Donations, Donor, Donors } from 'types/schemas/tiltify';
import { useReplicant } from 'use-nodecg';

import { formatAmounts } from '../utils';
import { Donation as DonationComponent } from './donation';
import { SortSettings } from './settings';

interface DonoListProps {
	sortSettings: SortSettings;
	setSortSettings: React.Dispatch<React.SetStateAction<SortSettings>>;
}

interface SortedDonosProps extends DonoListProps {
	donos: Basedono[] | Donation[];
}

export function SortedDonations({ donos, sortSettings, setSortSettings }: SortedDonosProps) {
	if (!donos || !donos[0]) return <h5>Loading or No Donations Yet!</h5>;

	if ("read" in donos[0]) {
		donos = (donos as Donation[]).filter((d) => {
			return ((sortSettings.show.includes("read") && d.read) || (sortSettings.show.includes("unread") && !d.read)) &&
				((sortSettings.show.includes("approved") && d.modStatus === APPROVED) ||
					(sortSettings.show.includes("undecided") && d.modStatus === UNDECIDED) ||
					(sortSettings.show.includes("censored") && d.modStatus === CENSORED))
		})
		if (donos.length === 0) return <h5>All Donations Filtered Out!</h5>
	} else {
		donos = [...donos]
	}
	const sortedDonos = donos.sort((a: Basedono, b: Basedono) => {
		const va = sortSettings.sort === "money" ? a.amount.value : b.completed_at;
		const vb = sortSettings.sort === "money" ? b.amount.value : a.completed_at;
		var result = (va < vb) ? -1 : (va > vb) ? 1 : 0;
		return result * (sortSettings.dir === "asc" ? 1 : -1);
	})

	return (
		<div className="donations">
			{sortedDonos.map((d) => <DonationComponent key={d.id} dono={d as unknown as Donation} />)}
		</div>
	)
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


export interface DonorProps extends DonoListProps {
	name: string;
	donor?: Donor;
	donations: Donation[];
	total: number;
	latest: string;
}

// https://upmostly.com/typescript/implementing-groupby-in-typescript
function groupBy<T>(arr: T[], fn: (item: T) => any) {
	return arr.reduce<Record<string, T[]>>((prev, curr) => {
		const groupKey = fn(curr);
		const group = prev[groupKey] || [];
		group.push(curr);
		return { ...prev, [groupKey]: group };
	}, {});
}

export function DonorsComp(props: DonoListProps) {
	const [d, setDonos] = useReplicant<Donations>("donations", [], { namespace: "nodecg-tiltify" });
	const donos = d === undefined ? [] : d;
	const [dr, setDonors] = useReplicant<Donors>("donors", [], { namespace: "nodecg-tiltify" });
	const donors = dr === undefined ? {} : Object.fromEntries(dr.map(d => [d.name, d]));

	// Construct donor summary
	const donors_donos = Object.entries(groupBy(donos, (d: Donation) => d.donor_name))
	const details = donors_donos.map<DonorProps>(([n, ds]) => {
		return {
			name: n,
			donations: ds,
			donor: donors[n],
			total: ds.reduce<number>((t, d) => t += (d.displayAmount ? Number(d.displayAmount.value) : 0), 0),
			latest: ds.reduce<string>((t, d) => d.completed_at > t ? d.completed_at : t, ""),
			...props
		}
	});
	// Sort by time or money
	details.sort((a, b) => {
		const va = props.sortSettings.sort === "money" ? a.total : b.latest;
		const vb = props.sortSettings.sort === "money" ? b.total : a.latest;
		var result = (va < vb) ? -1 : (va > vb) ? 1 : 0;
		return result * (props.sortSettings.dir === "asc" ? 1 : -1);
	})

	return <div className="donations gap-3 d-block">{details.map(DonorComp)}</div>;
}


function DonorComp(props: DonorProps) {
	// Details of donor and drop down list of donations
	const { name, donor, donations, total, latest } = props;

	const dispCurr = donations[0]?.displayAmount?.currency || "GDP";
	return (
		<details key={name} className="card m-2 card-body">
			<summary className="h5 card-title">
				<h2 className="h5 card-title d-inline">
					<span className="name">{name}</span>{" "}
					<span className="donated">donated</span>{" "}
					<span className="amount">{formatAmounts(donor?.amount, { currency: dispCurr, value: total })}</span>
				</h2>
			</summary>
			<div className="mt-2 mb-1">
				<SortedDonations donos={donations} {...props} />
			</div>
		</details>
	)
}

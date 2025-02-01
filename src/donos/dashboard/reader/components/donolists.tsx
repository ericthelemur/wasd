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
	hideButtons?: boolean;
}

export function SortedDonations({ donos, sortSettings, setSortSettings, hideButtons }: SortedDonosProps) {
	if (!donos || !donos[0]) return <h5>Loading or No Donations Yet!</h5>;

	if ("read" in donos[0] && !hideButtons) {
		donos = (donos as Donation[]).filter((d) => {
			return ((sortSettings.show.includes("read") && d.read) || (sortSettings.show.includes("unread") && !d.read)) &&
				((sortSettings.show.includes("approved") && d.modStatus === APPROVED) ||
					(sortSettings.show.includes("undecided") && d.modStatus === UNDECIDED) ||
					(sortSettings.show.includes("censored") && d.modStatus === CENSORED)) &&
				(!sortSettings.term.trim() ||
					(sortSettings.term && d.donor_name && d.donor_name.includes(sortSettings.term)) ||
					(sortSettings.term && d.donor_comment && d.donor_comment.includes(sortSettings.term)))
		})
		if (donos.length === 0) return <h5>All Donations Filtered Out!</h5>
	} else {
		donos = [...donos] as Basedono[];
	}
	const sortedDonos = donos.sort((a: Basedono | Donation, b: Basedono | Donation) => {
		const va = sortSettings.sort === "money" ? Number(a.amount.value) : b.completed_at;
		const vb = sortSettings.sort === "money" ? Number(b.amount.value) : a.completed_at;
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
	const [d, setDonos] = useReplicant<Donations>("donations", []);
	const donos = d === undefined ? [] : d;
	return <SortedDonations donos={donos} {...props} />
}

export function AllDonations(props: DonoListProps) {
	const [d, setDonos] = useReplicant<Alldonations>("alldonations", []);
	const donos = d === undefined ? [] : d;
	return <SortedDonations donos={donos} {...props} />
}

// TODO: Tiltify donations have a free text donor_name
// leaderboard links to accounts/emails(?) (to some extent)
// This leads to a big mismatch on the donors list
// For now, disabled donor list and taking tiltify's list

export interface DonorProps extends DonoListProps {
	name: string;
	donor?: Donor;
	donations: Basedono[];
	total: number;
	latest: string;
	oldest: string;
}


function groupBy<T>(arr: T[], fn: (item: T) => any) {
	let groups: Record<string, T[]> = {};
	for (let val of arr) {
		const key = fn(val);
		if (!(key in groups)) groups[key] = [];
		groups[key].push(val);
	}
	return groups;
}

export function DonorsComp(props: DonoListProps) {
	const [d,] = useReplicant<Alldonations>("alldonations", []);
	const donos = d === undefined ? [] : d;
	const [dr,] = useReplicant<Donors>("donors", []);
	const donors = dr === undefined ? {} : Object.fromEntries(dr.map(d => [d.name, d]));

	// Construct donor summary
	const donors_donos = Object.entries(groupBy(donos, (d: Basedono) => d.donor_name))
	const details = donors_donos.map<DonorProps>(([n, ds]) => {
		return {
			name: n,
			donations: ds,
			donor: donors[n],
			total: ds.reduce<number>((t, d) => t += Number(d.amount.value) || 0, 0),
			latest: ds.reduce<string>((t, d) => d.completed_at > t ? d.completed_at : t, ""),
			oldest: ds.reduce<string>((t, d) => d.completed_at < t ? d.completed_at : t, ""),
			...props
		}
	});
	details.sort((a, b) => {
		const va = props.sortSettings.sort === "money" ? a.total : b.latest;
		const vb = props.sortSettings.sort === "money" ? b.total : a.latest;
		var result = (va < vb) ? -1 : (va > vb) ? 1 : 0;
		return result * (props.sortSettings.dir === "asc" ? 1 : -1);
	})

	return <>
		<DonorsSimpleComp {...props} />
		Note: Donation names are input freely by the donator, the same name does not necessarily mean the same person, and different names are not necessarily different people.
		<div className="donations gap-3 d-block">{details.map(DonorComp)}</div>
	</>;
}


function DonorComp(props: DonorProps) {
	// Details of donor and drop down list of donations
	const { donor, donations, total, name } = props;

	const dispCurr = donations[0]?.amount.currency || "GDP";
	return (
		<details key={name} className="card m-2 card-body">
			<summary className="h5 card-title">
				<h2 className="h5 card-title d-inline">
					<span className="name">{name}</span>{" "}
					<span className="donated">donated</span>{" "}
					<span className="amount">{formatAmounts({ currency: dispCurr, value: total }, undefined)}</span>{" "}
					<span className="donated">(in {donations.length} dono{donations.length == 1 ? "" : "s"})</span>

				</h2>
			</summary>
			<div className="mt-2 mb-1">
				<SortedDonations donos={donations} {...props} />
			</div>
		</details>
	)
}



export function DonorsSimpleComp(props: DonoListProps) {
	const [dr,] = useReplicant<Donors>("donors", []);
	if (!dr) return null;

	// [...dr].sort((a, b) => {
	// 	const va = a.amount.value;
	// 	const vb = b.amount.value;
	// 	var result = (va < vb) ? -1 : (va > vb) ? 1 : 0;
	// 	return result * (props.sortSettings.dir === "asc" ? 1 : -1);
	// })

	return <details className="card m-2 card-body">
		<summary className="h5 card-title">
			<h2 className="h5 card-title d-inline">
				Tiltify Leaderboard (Top 20)
			</h2>
		</summary>
		This goes by Tiltify accounts, so are more accurate, but I cannot reconstruct exact donos from these accounts FOR SOME REASON
		<div className="mt-2 mb-1">
			<div className="donations gap-3 d-block">{dr.slice(0, 20).map((d, i) => <DonorSimpleComp key={d.id} donor={d} index={i} />)}</div>
		</div>
	</details>
}


function DonorSimpleComp({ donor, index }: { donor: Donor, index: number }) {
	// Details of donor and drop down list of donations

	return <div key={donor!.name}>
		<h2 className="h5">
			<span className="donated tabnum">#{index + 1}.</span>{" "}
			<span className="name">{donor!.name}</span>{" "}
			<span className="donated">donated</span>{" "}
			<span className="amount">{formatAmounts(donor!.amount, undefined)}</span>
		</h2>
	</div>
}
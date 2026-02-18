import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatShowTime } from '../../lib/dateUtils';

interface Show {
	id: string;
	date: string;
	showTime: string;
	activeAt: string | null;
	lockedAt: string | null;
}

export function PastShowsPage() {
	const [shows, setShows] = useState<Show[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api
			.get<Show[]>('/shows')
			.then((data) => {
				const past = data
					.filter((s) => !!s.lockedAt)
					.sort(
						(a, b) =>
							new Date(b.date).getTime() - new Date(a.date).getTime() ||
							b.showTime.localeCompare(a.showTime),
					);
				setShows(past);
			})
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <div className="muted">Loading...</div>;

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Past shows</h1>
					<p className="page-subtitle">Closed shows can be reviewed and corrected.</p>
				</div>
			</div>
			<div className="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Date</th>
							<th>Time</th>
							<th>Closed</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{shows.map((show) => (
							<tr key={show.id}>
								<td>{new Date(show.date).toLocaleDateString()}</td>
								<td>{formatShowTime(show.showTime)}</td>
								<td>{show.lockedAt ? new Date(show.lockedAt).toLocaleString() : '—'}</td>
								<td>
									<Link className="btn btn--sm btn--ghost" to={`/admin/past-shows/${show.id}`}>
										View sign-in sheet
									</Link>
								</td>
							</tr>
						))}
						{shows.length === 0 && (
							<tr>
								<td colSpan={4} className="muted">
									No past shows yet.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

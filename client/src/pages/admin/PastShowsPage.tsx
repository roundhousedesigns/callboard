import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, HTMLTable, Spinner } from '@blueprintjs/core';
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
	const navigate = useNavigate();
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

	if (loading) {
		return (
			<div className="page-centered">
				<Spinner size={28} />
			</div>
		);
	}

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Past shows</h1>
					<p className="page-subtitle">Closed shows can be reviewed and corrected.</p>
				</div>
			</div>
			<Card className="table-card">
				<HTMLTable bordered striped interactive condensed className="admin-table">
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
									<Button
										small
										text="View sign-in sheet"
										onClick={() => navigate(`/admin/shows/past/${show.id}`)}
									/>
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
				</HTMLTable>
			</Card>
		</div>
	);
}

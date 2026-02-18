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
	signInToken: string | null;
}

export function ShowsPage() {
	const [shows, setShows] = useState<Show[]>([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState({ date: '', showTime: '' });
	const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

	useEffect(() => {
		api
			.get<Show[]>('/shows')
			.then(setShows)
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		try {
			const show = await api.post<Show>('/shows', form);
			setShows((prev) =>
				[...prev, show].sort(
					(a, b) =>
						new Date(a.date).getTime() - new Date(b.date).getTime() ||
						a.showTime.localeCompare(b.showTime),
				),
			);
			setForm({ date: '', showTime: '' });
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed');
		}
	}

	async function handleActivate(id: string) {
		try {
			const updated = await api.post<Show>(`/shows/${id}/activate`);
			setShows((prev) => prev.map((s) => (s.id === id ? updated : { ...s, activeAt: null })));
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed');
		}
	}

	async function handleCloseSignIn(id: string) {
		try {
			const updated = await api.post<Show>(`/shows/${id}/close-signin`);
			setShows((prev) => prev.map((s) => (s.id === id ? updated : s)));
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed');
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Delete this show?')) return;
		try {
			await api.delete(`/shows/${id}`);
			setShows((prev) => prev.filter((s) => s.id !== id));
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed');
		}
	}

	const currentShow = shows.find((s) => !!s.activeAt) ?? null;
	const upcomingShows = shows
		.filter((s) => !s.activeAt && !s.lockedAt)
		.sort(
			(a, b) =>
				new Date(a.date).getTime() - new Date(b.date).getTime() ||
				a.showTime.localeCompare(b.showTime),
		);
	const pastShows = shows
		.filter((s) => !!s.lockedAt)
		.sort(
			(a, b) =>
				new Date(b.date).getTime() - new Date(a.date).getTime() ||
				b.showTime.localeCompare(a.showTime),
		);

	if (loading) return <div>Loading...</div>;

	return (
		<div>
			<h1>Shows</h1>
			<form
				onSubmit={handleCreate}
				style={{
					display: 'flex',
					gap: '0.5rem',
					flexWrap: 'wrap',
					marginBottom: '1.5rem',
				}}
			>
				<input
					type="date"
					value={form.date}
					onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
					required
				/>
				<input
					type="time"
					value={form.showTime}
					onChange={(e) => setForm((p) => ({ ...p, showTime: e.target.value }))}
					required
				/>
				<button type="submit">Add show</button>
			</form>

			{currentShow && (
				<div
					style={{
						marginBottom: '1.5rem',
						padding: '0.75rem',
						border: '1px solid var(--border)',
						borderRadius: '8px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: '1rem',
						flexWrap: 'wrap',
					}}
				>
					<div>
						<strong>Current show:</strong> {new Date(currentShow.date).toLocaleDateString()} -{' '}
						{formatShowTime(currentShow.showTime)}
					</div>
					<div style={{ display: 'flex', gap: '0.5rem' }}>
						<Link to="/admin/qr">Open current QR</Link>
						<button onClick={() => handleCloseSignIn(currentShow.id)}>Close sign-in</button>
					</div>
				</div>
			)}

			<div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
				<button
					type="button"
					onClick={() => setTab('upcoming')}
					style={{
						background: tab === 'upcoming' ? 'var(--bg-hover)' : 'var(--bg-elevated)',
					}}
				>
					Upcoming shows
				</button>
				<button
					type="button"
					onClick={() => setTab('past')}
					style={{
						background: tab === 'past' ? 'var(--bg-hover)' : 'var(--bg-elevated)',
					}}
				>
					Past shows
				</button>
			</div>

			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Time</th>
						<th>Status</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{tab === 'upcoming' &&
						upcomingShows.map((show) => (
							<tr key={show.id}>
								<td>{new Date(show.date).toLocaleDateString()}</td>
								<td>{formatShowTime(show.showTime)}</td>
								<td>
									<span style={{ color: 'var(--text-muted)' }}>Scheduled</span>
								</td>
								<td>
									<button onClick={() => handleActivate(show.id)}>Open Sign-in</button>
									<button onClick={() => handleDelete(show.id)}>Delete</button>
								</td>
							</tr>
						))}
					{tab === 'past' &&
						pastShows.map((show) => (
							<tr key={show.id}>
								<td>{new Date(show.date).toLocaleDateString()}</td>
								<td>{formatShowTime(show.showTime)}</td>
								<td>
									<span style={{ color: 'var(--warning)' }}>Closed</span>
								</td>
								<td>
									<Link to={`/admin/shows/past/${show.id}`}>View sign-in sheet</Link>
								</td>
							</tr>
						))}
					{tab === 'upcoming' && upcomingShows.length === 0 && (
						<tr>
							<td colSpan={4} style={{ color: 'var(--text-muted)' }}>
								No upcoming shows.
							</td>
						</tr>
					)}
					{tab === 'past' && pastShows.length === 0 && (
						<tr>
							<td colSpan={4} style={{ color: 'var(--text-muted)' }}>
								No past shows yet.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

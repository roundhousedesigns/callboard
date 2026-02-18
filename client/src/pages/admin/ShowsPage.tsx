import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatShowTime } from '../../lib/dateUtils';

function QRCodeIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<rect x="3" y="3" width="7" height="7" rx="1" />
			<rect x="14" y="3" width="7" height="7" rx="1" />
			<rect x="3" y="14" width="7" height="7" rx="1" />
			<rect x="14" y="14" width="3" height="3" rx="0.5" />
			<rect x="19" y="14" width="2" height="2" rx="0.5" />
			<rect x="14" y="19" width="2" height="2" rx="0.5" />
		</svg>
	);
}

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

	const now = Date.now();
	const currentShow = shows.find((s) => !!s.activeAt) ?? null;
	const upcomingShows = shows
		.filter((s) => {
			if (s.activeAt || s.lockedAt) return false;
			const dt = new Date(s.date);
			const [h, m] = s.showTime.split(':').map(Number);
			dt.setHours(h, m || 0, 0, 0);
			return dt.getTime() > now;
		})
		.sort(
			(a, b) =>
				new Date(a.date).getTime() - new Date(b.date).getTime() ||
				a.showTime.localeCompare(b.showTime),
		);
	const nextUpcomingShowId = upcomingShows[0]?.id ?? null;
	const displayShows = currentShow
		? [currentShow, ...upcomingShows]
		: upcomingShows;
	const highlightedShowId = currentShow?.id ?? nextUpcomingShowId;

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

			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Time</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{displayShows.map((show) => {
						const isHighlighted = show.id === highlightedShowId;
						return (
							<tr
								key={show.id}
								style={
									isHighlighted
										? {
												background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
												borderLeft: '3px solid var(--accent)',
											}
										: undefined
								}
							>
								<td>{new Date(show.date).toLocaleDateString()}</td>
								<td>{formatShowTime(show.showTime)}</td>
								<td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
									{show.activeAt ? (
										<>
											<Link
												to="/admin/qr"
												aria-label="Open QR code"
												style={{
													display: 'inline-flex',
													alignItems: 'center',
													color: 'var(--accent)',
												}}
											>
												<QRCodeIcon />
											</Link>
											<button onClick={() => handleCloseSignIn(show.id)}>Close sign-in</button>
										</>
									) : (
										<>
											{!currentShow && show.id === nextUpcomingShowId ? (
												<button onClick={() => handleActivate(show.id)}>Open Sign-in</button>
											) : null}
											<button onClick={() => handleDelete(show.id)}>Delete</button>
										</>
									)}
								</td>
							</tr>
						);
					})}
					{displayShows.length === 0 && (
						<tr>
							<td colSpan={3} style={{ color: 'var(--text-muted)' }}>
								No upcoming shows.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

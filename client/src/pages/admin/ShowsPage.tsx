import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatShowTime, toLocalDateStr } from '../../lib/dateUtils';
import { Button, TextFieldInput } from '../../components/ui';

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
	const [editingShowId, setEditingShowId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState({ date: '', showTime: '' });
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

	function startEdit(show: Show) {
		setEditingShowId(show.id);
		setEditForm({
			date: toLocalDateStr(new Date(show.date)),
			showTime: show.showTime.slice(0, 5),
		});
	}

	function cancelEdit() {
		setEditingShowId(null);
	}

	async function handleSaveEdit(id: string) {
		try {
			const updated = await api.patch<Show>(`/shows/${id}`, editForm);
			setShows((prev) =>
				prev
					.map((s) => (s.id === id ? updated : s))
					.sort(
						(a, b) =>
							new Date(a.date).getTime() - new Date(b.date).getTime() ||
							a.showTime.localeCompare(b.showTime),
					),
			);
			setEditingShowId(null);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to update show');
		}
	}

	const currentShow = shows.find((s) => !!s.activeAt) ?? null;
	const eligibleShows = shows
		.filter((s) => !s.activeAt && !s.lockedAt)
		.sort(
			(a, b) =>
				new Date(a.date).getTime() - new Date(b.date).getTime() ||
				a.showTime.localeCompare(b.showTime),
		);
	const nextEligibleShowId = eligibleShows[0]?.id ?? null;
	const displayShows = currentShow
		? [currentShow, ...eligibleShows]
		: eligibleShows;
	const highlightedShowId = currentShow?.id ?? nextEligibleShowId;

	if (loading) return <div className="muted">Loading...</div>;

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Shows</h1>
					<p className="page-subtitle">Create upcoming shows and open sign-in.</p>
				</div>
			</div>
			<form
				onSubmit={handleCreate}
				className="toolbar no-print"
				style={{ marginBottom: '1rem' }}
			>
				<TextFieldInput
					label="Date"
					value={form.date}
					onChange={(value) => setForm((p) => ({ ...p, date: value }))}
					isRequired
					inputProps={{ type: 'date' }}
				/>
				<TextFieldInput
					label="Time"
					value={form.showTime}
					onChange={(value) => setForm((p) => ({ ...p, showTime: value }))}
					isRequired
					inputProps={{ type: 'time' }}
				/>
				<Button
					variant="primary"
					size="sm"
					type="submit"
				>
					Add show
				</Button>
			</form>

			<div className="table-wrap">
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
							const isEditing = editingShowId === show.id;
							return (
								<tr
									key={show.id}
									style={
										isHighlighted
											? {
													background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
													borderLeft: '3px solid var(--accent)',
												}
											: undefined
									}
								>
									{isEditing ? (
										<>
											<td>
												<TextFieldInput
													aria-label="Date"
													value={editForm.date}
													onChange={(value) => setEditForm((p) => ({ ...p, date: value }))}
													inputProps={{ type: 'date' }}
												/>
											</td>
											<td>
												<TextFieldInput
													aria-label="Time"
													value={editForm.showTime}
													onChange={(value) => setEditForm((p) => ({ ...p, showTime: value }))}
													inputProps={{ type: 'time' }}
												/>
											</td>
											<td
												className="no-print"
												style={{
													display: 'flex',
													gap: '0.5rem',
													flexWrap: 'wrap',
													alignItems: 'center',
													justifyContent: 'flex-end',
												}}
											>
												<Button
													size="sm"
													variant="primary"
													type="button"
													onPress={() => handleSaveEdit(show.id)}
												>
													Save
												</Button>
												<Button
													size="sm"
													type="button"
													onPress={cancelEdit}
												>
													Cancel
												</Button>
											</td>
										</>
									) : (
										<>
											<td>{new Date(show.date).toLocaleDateString()}</td>
											<td>{formatShowTime(show.showTime)}</td>
											<td
												className="no-print"
												style={{
													display: 'flex',
													gap: '0.5rem',
													flexWrap: 'wrap',
													alignItems: 'center',
													justifyContent: 'flex-end',
												}}
											>
												<Button
													size="sm"
													variant="ghost"
													type="button"
													onPress={() => startEdit(show)}
												>
													Edit
												</Button>
												{show.activeAt ? (
													<>
														<Link
															to="/admin/qr"
															aria-label="Open QR code"
															className="btn btn--sm btn--ghost"
															style={{ padding: '0.35rem 0.5rem' }}
														>
															<QRCodeIcon />
														</Link>
														<Button
															size="sm"
															onPress={() => handleCloseSignIn(show.id)}
														>
															Close sign-in
														</Button>
													</>
												) : (
													<>
														{!currentShow && show.id === nextEligibleShowId ? (
															<Button
																size="sm"
																variant="primary"
																onPress={() => handleActivate(show.id)}
															>
																Open sign-in
															</Button>
														) : null}
														<Button
															size="sm"
															variant="danger"
															onPress={() => handleDelete(show.id)}
														>
															Delete
														</Button>
													</>
												)}
											</td>
										</>
									)}
								</tr>
							);
						})}
						{displayShows.length === 0 && (
							<tr>
								<td colSpan={3} className="muted">
									No upcoming shows.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

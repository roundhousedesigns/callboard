import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Button,
	Callout,
	Card,
	Classes,
	FormGroup,
	HTMLTable,
	Spinner,
} from '@blueprintjs/core';
import { api } from '../../lib/api';
import { formatShowTime, toLocalDateStr } from '../../lib/dateUtils';

interface Show {
	id: string;
	date: string;
	showTime: string;
	activeAt: string | null;
	lockedAt: string | null;
	signInToken: string | null;
}

export function ShowsPage() {
	const navigate = useNavigate();
	const [shows, setShows] = useState<Show[]>([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState<{ type: 'danger' | 'success'; text: string } | null>(null);
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
		setMessage(null);
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
			setMessage({ type: 'success', text: 'Show added.' });
		} catch (err) {
			setMessage({ type: 'danger', text: err instanceof Error ? err.message : 'Failed to create show.' });
		}
	}

	async function handleActivate(id: string) {
		setMessage(null);
		try {
			const updated = await api.post<Show>(`/shows/${id}/activate`);
			setShows((prev) => prev.map((s) => (s.id === id ? updated : { ...s, activeAt: null })));
			setMessage({ type: 'success', text: 'Sign-in opened.' });
		} catch (err) {
			setMessage({
				type: 'danger',
				text: err instanceof Error ? err.message : 'Failed to open sign-in.',
			});
		}
	}

	async function handleCloseSignIn(id: string) {
		setMessage(null);
		try {
			const updated = await api.post<Show>(`/shows/${id}/close-signin`);
			setShows((prev) => prev.map((s) => (s.id === id ? updated : s)));
			setMessage({ type: 'success', text: 'Sign-in closed.' });
		} catch (err) {
			setMessage({
				type: 'danger',
				text: err instanceof Error ? err.message : 'Failed to close sign-in.',
			});
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Delete this show?')) return;
		setMessage(null);
		try {
			await api.delete(`/shows/${id}`);
			setShows((prev) => prev.filter((s) => s.id !== id));
			setMessage({ type: 'success', text: 'Show deleted.' });
		} catch (err) {
			setMessage({ type: 'danger', text: err instanceof Error ? err.message : 'Failed to delete show.' });
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
		setMessage(null);
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
			setMessage({ type: 'success', text: 'Show updated.' });
		} catch (err) {
			setMessage({
				type: 'danger',
				text: err instanceof Error ? err.message : 'Failed to update show.',
			});
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
					<h1 className="page-title">Shows</h1>
					<p className="page-subtitle">Create upcoming shows and open sign-in.</p>
				</div>
			</div>
			{message && <Callout intent={message.type}>{message.text}</Callout>}
			<Card className="no-print toolbar-card">
				<form onSubmit={handleCreate} className="toolbar-grid">
					<FormGroup label="Date" className="toolbar-field">
						<input
							className={Classes.INPUT}
							type="date"
							value={form.date}
							onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
							required
						/>
					</FormGroup>
					<FormGroup label="Time" className="toolbar-field">
						<input
							className={Classes.INPUT}
							type="time"
							value={form.showTime}
							onChange={(e) => setForm((p) => ({ ...p, showTime: e.target.value }))}
							required
						/>
					</FormGroup>
					<div className="toolbar-actions">
						<Button small intent="primary" type="submit" text="Add show" />
					</div>
				</form>
			</Card>

			<Card className="table-card">
				<HTMLTable bordered striped interactive className="admin-table">
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
													background: 'color-mix(in srgb, var(--app-accent) 14%, transparent)',
												}
											: undefined
									}
								>
									{isEditing ? (
										<>
											<td>
												<input
													className={Classes.INPUT}
													type="date"
													value={editForm.date}
													onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
													aria-label="Date"
												/>
											</td>
											<td>
												<input
													className={Classes.INPUT}
													type="time"
													value={editForm.showTime}
													onChange={(e) => setEditForm((p) => ({ ...p, showTime: e.target.value }))}
													aria-label="Time"
												/>
											</td>
											<td
												className="no-print"
												style={{ whiteSpace: 'nowrap' }}
											>
												<div className="inline-actions align-right">
													<Button
														small
														intent="primary"
														type="button"
														text="Save"
														onClick={() => {
															void handleSaveEdit(show.id);
														}}
													/>
													<Button small type="button" text="Cancel" onClick={cancelEdit} />
												</div>
											</td>
										</>
									) : (
										<>
											<td>{new Date(show.date).toLocaleDateString()}</td>
											<td>{formatShowTime(show.showTime)}</td>
											<td
												className="no-print"
												style={{ whiteSpace: 'nowrap' }}
											>
												<div className="inline-actions align-right">
													<Button
														small
														type="button"
														text="Edit"
														onClick={() => startEdit(show)}
													/>
												{show.activeAt ? (
													<>
														<Button
															small
															text="QR"
															onClick={() => navigate('/admin/qr')}
														/>
														<Button
															small
															text="Close sign-in"
															onClick={() => {
																void handleCloseSignIn(show.id);
															}}
														/>
													</>
												) : (
													<>
														{!currentShow && show.id === nextEligibleShowId ? (
															<Button
																small
																intent="primary"
																text="Open sign-in"
																onClick={() => {
																	void handleActivate(show.id);
																}}
															/>
														) : null}
														<Button
															small
															intent="danger"
															text="Delete"
															onClick={() => {
																void handleDelete(show.id);
															}}
														/>
													</>
												)}
												</div>
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
				</HTMLTable>
			</Card>
		</div>
	);
}

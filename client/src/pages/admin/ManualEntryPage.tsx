import { useState, useEffect } from 'react';
import type { User } from '../../lib/auth';
import { api } from '../../lib/api';
import { formatShowTime } from '../../lib/dateUtils';

interface Show {
	id: string;
	date: string;
	showTime: string;
}

export function ManualEntryPage() {
	const [shows, setShows] = useState<Show[]>([]);
	const [actors, setActors] = useState<User[]>([]);
	const [selectedShow, setSelectedShow] = useState<string>('');
	const [selectedActors, setSelectedActors] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([api.get<Show[]>('/shows'), api.get<User[]>('/users')])
			.then(([s, a]) => {
				setShows(s.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
				setActors(
					a.filter((u) => u.role === 'actor').sort((a, b) => a.lastName.localeCompare(b.lastName)),
				);
			})
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	function toggleActor(id: string) {
		setSelectedActors((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!selectedShow || selectedActors.size === 0) return;
		setMessage(null);
		setSubmitting(true);
		try {
			await api.post('/attendance/bulk', {
				showId: selectedShow,
				userIds: Array.from(selectedActors),
			});
			setMessage(`Successfully recorded ${selectedActors.size} sign-in(s).`);
			setSelectedActors(new Set());
		} catch (err) {
			setMessage(err instanceof Error ? err.message : 'Failed');
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) return <div className="muted">Loading...</div>;

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Manual Sign-In Entry</h1>
					<p className="page-subtitle">
						Enter sign-ins from a printed attendance sheet after internet is restored.
					</p>
				</div>
			</div>
			<form onSubmit={handleSubmit} className="card card--flat stack" style={{ maxWidth: '34rem' }}>
				<label className="field">
					<span className="field-label">Show</span>
					<select value={selectedShow} onChange={(e) => setSelectedShow(e.target.value)} required>
						<option value="">Select a show</option>
						{shows.map((s) => (
							<option key={s.id} value={s.id}>
								{new Date(s.date).toLocaleDateString()} — {formatShowTime(s.showTime)}
							</option>
						))}
					</select>
				</label>
				<div className="field">
					<span className="field-label">Actors who signed in</span>
					<div className="scrollbox">
						{actors.map((actor) => (
							<label key={actor.id} className="checkbox-row" style={{ padding: '0.25rem 0' }}>
								<input
									type="checkbox"
									checked={selectedActors.has(actor.id)}
									onChange={() => toggleActor(actor.id)}
								/>
								{actor.lastName}, {actor.firstName}
							</label>
						))}
					</div>
				</div>
				{message && (
					<div className={`alert ${message.includes('Success') ? 'alert--success' : 'alert--error'}`}>
						{message}
					</div>
				)}
				<button className="btn btn--primary" type="submit" disabled={submitting || selectedActors.size === 0}>
					{submitting ? 'Submitting...' : 'Submit sign-ins'}
				</button>
			</form>
		</div>
	);
}

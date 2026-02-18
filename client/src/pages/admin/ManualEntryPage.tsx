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

	if (loading) return <div>Loading...</div>;

	return (
		<div>
			<h1>Manual Sign-In Entry</h1>
			<p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
				Enter sign-ins from a printed attendance sheet after internet is restored.
			</p>
			<form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
				<div style={{ marginBottom: '1rem' }}>
					<label style={{ display: 'block', marginBottom: '0.5rem' }}>Show</label>
					<select
						value={selectedShow}
						onChange={(e) => setSelectedShow(e.target.value)}
						required
						style={{ width: '100%' }}
					>
						<option value="">Select a show</option>
						{shows.map((s) => (
							<option key={s.id} value={s.id}>
								{new Date(s.date).toLocaleDateString()} — {formatShowTime(s.showTime)}
							</option>
						))}
					</select>
				</div>
				<div style={{ marginBottom: '1rem' }}>
					<label style={{ display: 'block', marginBottom: '0.5rem' }}>Actors who signed in</label>
					<div
						style={{
							maxHeight: '300px',
							overflowY: 'auto',
							border: '1px solid var(--border)',
							borderRadius: '6px',
							padding: '0.5rem',
						}}
					>
						{actors.map((actor) => (
							<label
								key={actor.id}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									padding: '0.25rem 0',
								}}
							>
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
					<div
						style={{
							marginBottom: '1rem',
							padding: '0.5rem',
							background: message.includes('Success')
								? 'rgba(63, 185, 80, 0.2)'
								: 'rgba(248, 81, 73, 0.2)',
							borderRadius: '6px',
						}}
					>
						{message}
					</div>
				)}
				<button type="submit" disabled={submitting || selectedActors.size === 0}>
					{submitting ? 'Submitting...' : 'Submit sign-ins'}
				</button>
			</form>
		</div>
	);
}

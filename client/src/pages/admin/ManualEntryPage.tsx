import { useState, useEffect } from 'react';
import {
	Button,
	Callout,
	Card,
	Checkbox,
	FormGroup,
	HTMLSelect,
	Spinner,
} from '@blueprintjs/core';
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
	const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

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
			setMessage({
				type: 'success',
				text: `Successfully recorded ${selectedActors.size} sign-in(s).`,
			});
			setSelectedActors(new Set());
		} catch (err) {
			setMessage({
				type: 'danger',
				text: err instanceof Error ? err.message : 'Failed to submit sign-ins.',
			});
		} finally {
			setSubmitting(false);
		}
	}

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
					<h1 className="page-title">Manual Sign-In Entry</h1>
					<p className="page-subtitle">
						Enter sign-ins from a printed attendance sheet after internet is restored.
					</p>
				</div>
			</div>
			<Card className="form-card">
				<form onSubmit={handleSubmit} className="form-stack">
					<FormGroup label="Show">
						<HTMLSelect
							fill
							value={selectedShow}
							onChange={(e) => setSelectedShow(e.target.value)}
							required
						>
							<option value="">Select a show</option>
							{shows.map((s) => (
								<option key={s.id} value={s.id}>
									{new Date(s.date).toLocaleDateString()} — {formatShowTime(s.showTime)}
								</option>
							))}
						</HTMLSelect>
					</FormGroup>
					<FormGroup label="Actors who signed in">
						<div className="scrollbox">
							{actors.map((actor) => (
								<Checkbox
									key={actor.id}
									checked={selectedActors.has(actor.id)}
									onChange={() => toggleActor(actor.id)}
									label={`${actor.lastName}, ${actor.firstName}`}
								/>
							))}
						</div>
					</FormGroup>
					{message && <Callout intent={message.type}>{message.text}</Callout>}
					<Button
						intent="primary"
						type="submit"
						loading={submitting}
						disabled={submitting || selectedActors.size === 0}
						text={submitting ? 'Submitting...' : 'Submit sign-ins'}
					/>
				</form>
			</Card>
		</div>
	);
}

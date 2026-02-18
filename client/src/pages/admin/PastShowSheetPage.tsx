import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { CallboardTable, type AttendanceRecord, type Show } from '../../components/CallboardTable';
import { api } from '../../lib/api';
import type { User } from '../../lib/auth';
import { formatShowTime } from '../../lib/dateUtils';

export function PastShowSheetPage() {
	const { showId } = useParams<{ showId: string }>();
	const { user } = useAuth();
	const [show, setShow] = useState<Show | null>(null);
	const [actors, setActors] = useState<User[]>([]);
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!showId) return;
		Promise.all([
			api.get<Show>(`/shows/${showId}`),
			api.get<User[]>('/users'),
			api.get<Array<{ userId: string; showId: string; status: string }>>(
				`/attendance?showId=${showId}`,
			),
		])
			.then(([showRes, usersRes, attRes]) => {
				setShow(showRes);
				setActors(usersRes.filter((u) => u.role === 'actor'));
				setAttendance(
					attRes.map((a) => ({
						userId: a.userId,
						showId: a.showId,
						status: a.status as AttendanceRecord['status'],
					})),
				);
			})
			.catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
			.finally(() => setLoading(false));
	}, [showId]);

	async function handleSetStatus(
		userId: string,
		showIdValue: string,
		status: AttendanceRecord['status'] | null,
	) {
		try {
			if (status === null) {
				await api.delete(`/attendance?userId=${userId}&showId=${showIdValue}`);
				setAttendance((prev) =>
					prev.filter((a) => !(a.userId === userId && a.showId === showIdValue)),
				);
				return;
			}
			await api.post('/attendance', { userId, showId: showIdValue, status });
			setAttendance((prev) => {
				const rest = prev.filter((a) => !(a.userId === userId && a.showId === showIdValue));
				return [...rest, { userId, showId: showIdValue, status }];
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update');
		}
	}

	if (loading) return <div>Loading...</div>;
	if (error) return <div style={{ color: 'var(--error)' }}>{error}</div>;
	if (!show) return <div>Show not found</div>;

	const displayTitle =
		user?.organization?.showTitle ?? user?.organization?.name ?? 'Sign-in sheet corrections';

	return (
		<div>
			<div style={{ marginBottom: '1rem' }}>
				<Link to="/admin/shows">Back to shows</Link>
			</div>
			<h1>{displayTitle}</h1>
			<p style={{ color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
				Sign-in sheet corrections
			</p>
			<p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
				{new Date(show.date).toLocaleDateString()} - {formatShowTime(show.showTime)}
			</p>
			<CallboardTable
				actors={actors}
				shows={[show]}
				attendance={attendance}
				onSetStatus={handleSetStatus}
			/>
		</div>
	);
}

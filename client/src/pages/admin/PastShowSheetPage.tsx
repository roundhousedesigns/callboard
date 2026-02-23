import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Callout, Spinner } from '@blueprintjs/core';
import { useAuth } from '../../lib/auth';
import { CallboardTable, type AttendanceRecord, type Show } from '../../components/CallboardTable';
import { api } from '../../lib/api';
import type { User } from '../../lib/auth';
import { formatShowTime } from '../../lib/dateUtils';

export function PastShowSheetPage() {
	const { showId } = useParams<{ showId: string }>();
	const navigate = useNavigate();
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

	if (loading) {
		return (
			<div className="page-centered">
				<Spinner size={28} />
			</div>
		);
	}

	if (error) return <Callout intent="danger">{error}</Callout>;
	if (!show) return <Callout intent="warning">Show not found.</Callout>;

	const displayTitle =
		user?.organization?.showTitle ?? user?.organization?.name ?? 'Sign-in sheet corrections';

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">{displayTitle}</h1>
					<p className="page-subtitle">Sign-in sheet corrections</p>
				</div>
				<div className="no-print">
					<Button small text="Back to shows" onClick={() => navigate('/admin/shows')} />
				</div>
			</div>
			<p className="muted">
				{new Date(show.date).toLocaleDateString()} — {formatShowTime(show.showTime)}
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

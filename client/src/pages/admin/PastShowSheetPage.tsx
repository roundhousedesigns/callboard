import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth, getMembership } from '../../lib/auth';
import { CallboardTable, type AttendanceRecord, type Show } from '../../components/CallboardTable';
import { api } from '../../lib/api';
import { formatShowTime } from '../../lib/dateUtils';

interface OrgMember {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
}

export function PastShowSheetPage() {
	const { orgSlug, showId } = useParams<{ orgSlug: string; showId: string }>();
	const { user } = useAuth();
	const membership = orgSlug ? getMembership(user, orgSlug) : undefined;
	const [show, setShow] = useState<Show | null>(null);
	const [actors, setActors] = useState<OrgMember[]>([]);
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!showId || !orgSlug) return;
		const orgApi = api.org(orgSlug);
		Promise.all([
			orgApi.get<Show>(`/shows/${showId}`),
			orgApi.get<OrgMember[]>('/users'),
			orgApi.get<Array<{ userId: string; showId: string; status: string }>>(
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
	}, [showId, orgSlug]);

	async function handleSetStatus(
		userId: string,
		showIdValue: string,
		status: AttendanceRecord['status'] | null,
	) {
		if (!orgSlug) return;
		try {
			if (status === null) {
				await api.org(orgSlug).delete(`/attendance?userId=${userId}&showId=${showIdValue}`);
				setAttendance((prev) =>
					prev.filter((a) => !(a.userId === userId && a.showId === showIdValue)),
				);
				return;
			}
			await api.org(orgSlug).post('/attendance', { userId, showId: showIdValue, status });
			setAttendance((prev) => {
				const rest = prev.filter((a) => !(a.userId === userId && a.showId === showIdValue));
				return [...rest, { userId, showId: showIdValue, status }];
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update');
		}
	}

	if (loading) return <div className="muted">Loading...</div>;
	if (error) return <div className="alert alert--error">{error}</div>;
	if (!show) return <div className="alert">Show not found.</div>;

	const displayTitle =
		membership?.company?.showTitle ?? membership?.company?.name ?? 'Sign-in sheet corrections';

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">{displayTitle}</h1>
					<p className="page-subtitle">Sign-in sheet corrections</p>
				</div>
				<div className="no-print">
					<Link className="btn btn--sm btn--ghost" to={orgSlug ? `/admin/${orgSlug}/shows` : '#'}>
						Back to shows
					</Link>
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

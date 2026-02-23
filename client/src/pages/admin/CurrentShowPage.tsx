import { useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth, type User } from '../../lib/auth';
import {
	CurrentShowCallboard,
	type CurrentShowCallboardData,
} from '../../components/CurrentShowCallboard';
import type { AttendanceRecord, Show } from '../../components/CallboardTable';

export function CurrentShowPage() {
	const { user } = useAuth();

	const displayTitle =
		user?.organization?.showTitle ?? user?.organization?.name ?? 'Callboard';

	const load = useCallback(async (): Promise<CurrentShowCallboardData> => {
		const show = await api.get<Show>('/shows/active');
		const users = await api.get<User[]>('/users');
		const actors = users
			.filter((u) => u.role === 'actor')
			.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName }));
		const attendance = await api.get<Array<{ userId: string; showId: string; status: string }>>(
			`/attendance?showId=${show.id}`,
		);

		return {
			show,
			actors,
			attendance: attendance.map((a) => ({
				userId: a.userId,
				showId: a.showId,
				status: a.status as AttendanceRecord['status'],
			})),
		};
	}, []);

	const handleSetStatus = useCallback(
		async (
			userId: string,
			showId: string,
			status: AttendanceRecord['status'] | null,
		) => {
			if (status === null) {
				await api.delete(`/attendance?userId=${userId}&showId=${showId}`);
			} else {
				await api.post('/attendance', { userId, showId, status });
			}
		},
		[],
	);

	return (
		<div style={{ padding: '1.25rem' }}>
			<div className="page-header">
				<div>
					<h1 className="page-title">{displayTitle}</h1>
					<p className="page-subtitle">Callboard</p>
				</div>
			</div>
			<CurrentShowCallboard readOnly={false} load={load} onSetStatus={handleSetStatus} />
		</div>
	);
}


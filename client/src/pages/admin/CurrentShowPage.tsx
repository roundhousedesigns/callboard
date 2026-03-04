import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth, getMembership } from '../../lib/auth';
import {
	CurrentShowCallboard,
	type CurrentShowCallboardData,
} from '../../components/CurrentShowCallboard';
import type { AttendanceRecord, Show } from '../../components/CallboardTable';
import { useIsMobilePortrait } from '../../lib/useIsMobilePortrait';

interface OrgMember {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
}

export function CurrentShowPage() {
	const { orgSlug } = useParams<{ orgSlug: string }>();
	const { user } = useAuth();
	const membership = orgSlug ? getMembership(user, orgSlug) : undefined;
	const isMobilePortrait = useIsMobilePortrait();

	const displayTitle =
		membership?.organization?.showTitle ?? membership?.organization?.name ?? 'Callboard';

	const load = useCallback(async (): Promise<CurrentShowCallboardData> => {
		if (!orgSlug) throw new Error('No organization');
		const orgApi = api.org(orgSlug);
		const show = await orgApi.get<Show | null>('/shows/active');
		if (!show) {
			throw new Error('No active show');
		}
		const users = await orgApi.get<OrgMember[]>('/users');
		const actors = users
			.filter((u) => u.role === 'actor')
			.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName }));
		const attendance = await orgApi.get<Array<{ userId: string; showId: string; status: string }>>(
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
	}, [orgSlug]);

	const handleSetStatus = useCallback(
		async (
			userId: string,
			showId: string,
			status: AttendanceRecord['status'] | null,
		) => {
			if (!orgSlug) return;
			if (status === null) {
				await api.org(orgSlug).delete(`/attendance?userId=${userId}&showId=${showId}`);
			} else {
				await api.org(orgSlug).post('/attendance', { userId, showId, status });
			}
		},
		[orgSlug],
	);
	const handleSetStatusVoid = useCallback(
		(userId: string, showId: string, status: AttendanceRecord['status'] | null) => {
			void handleSetStatus(userId, showId, status);
		},
		[handleSetStatus],
	);

	return (
		<div style={{ padding: '1.25rem' }}>
			<div className="page-header">
				<div>
					<h1 className="page-title">{displayTitle}</h1>
					<p className="page-subtitle">Callboard</p>
				</div>
			</div>
			<CurrentShowCallboard
				readOnly={false}
				load={load}
				onSetStatus={handleSetStatusVoid}
				mobilePortrait={isMobilePortrait}
				orgSlug={orgSlug}
			/>
		</div>
	);
}

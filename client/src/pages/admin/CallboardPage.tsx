import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { CallboardTable } from '../../components/CallboardTable';
import type { Show, AttendanceRecord } from '../../components/CallboardTable';
import type { User } from '../../lib/auth';
import { api } from '../../lib/api';
import { toLocalDateStr, getWeekBounds } from '../../lib/dateUtils';

function getThisWeekRange() {
	const { start, end } = getWeekBounds(new Date());
	return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
}

export function CallboardPage() {
	const { user } = useAuth();
	const [actors, setActors] = useState<User[]>([]);
	const [shows, setShows] = useState<Show[]>([]);
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [dateRange, setDateRange] = useState({ start: '', end: '' });

	useEffect(() => {
		setDateRange(getThisWeekRange());
	}, []);

	const loadData = async (showLoading = true) => {
		if (!dateRange.start) return;
		if (showLoading) setLoading(true);
		else setRefreshing(true);
		try {
			const [usersRes, showsRes] = await Promise.all([
				api.get<User[]>('/users'),
				api.get<Show[]>(
					`/shows?start=${dateRange.start || '1970-01-01'}&end=${dateRange.end || '2099-12-31'}`,
				),
			]);
			setActors(usersRes.filter((u) => u.role === 'actor'));
			setShows(showsRes);

			const allAttendance: AttendanceRecord[] = [];
			for (const show of showsRes) {
				const att = await api.get<Array<{ userId: string; showId: string; status: string }>>(
					`/attendance?showId=${show.id}`,
				);
				allAttendance.push(
					...att.map((a) => ({
						userId: a.userId,
						showId: a.showId,
						status: a.status as AttendanceRecord['status'],
					})),
				);
			}
			setAttendance(allAttendance);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		loadData();
	}, [dateRange.start, dateRange.end]);

	useEffect(() => {
		if (!dateRange.start) return;
		const interval = setInterval(() => {
			if (document.visibilityState === 'visible') {
				loadData(false);
			}
		}, 30000);
		return () => clearInterval(interval);
	}, [dateRange.start, dateRange.end]);

	async function handleSetStatus(
		userId: string,
		showId: string,
		status: AttendanceRecord['status'] | null,
	) {
		try {
			if (status === null) {
				await api.delete(`/attendance?userId=${userId}&showId=${showId}`);
				setAttendance((prev) => prev.filter((a) => !(a.userId === userId && a.showId === showId)));
			} else {
				await api.post('/attendance', { userId, showId, status });
				setAttendance((prev) => {
					const rest = prev.filter((a) => !(a.userId === userId && a.showId === showId));
					return [...rest, { userId, showId, status }];
				});
			}
		} catch (err) {
			console.error(err);
		}
	}

	function setThisWeek() {
		setDateRange(getThisWeekRange());
	}

	function handlePrint() {
		window.print();
	}

	if (loading) return <div className="muted">Loading...</div>;

	const displayTitle =
		user?.organization?.showTitle ?? user?.organization?.name ?? 'Callboard';

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">{displayTitle}</h1>
					<p className="page-subtitle">Callboard</p>
				</div>
			</div>
			<div
				className="no-print"
				style={{ marginBottom: '1rem' }}
			>
				<div className="toolbar">
					<label className="field">
						<span className="field-label">Start</span>
						<input
							type="date"
							value={dateRange.start}
							onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
						/>
					</label>
					<label className="field">
						<span className="field-label">End</span>
						<input
							type="date"
							value={dateRange.end}
							onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
						/>
					</label>
					<button className="btn btn--sm" type="button" onClick={setThisWeek}>
						This Week
					</button>
					<button
						className="btn btn--sm btn--ghost"
						type="button"
						onClick={() => loadData(false)}
						disabled={refreshing || loading}
					>
						{refreshing ? 'Refreshing...' : 'Refresh'}
					</button>
					<button className="btn btn--sm btn--primary" type="button" onClick={handlePrint}>
						Print report
					</button>
				</div>
			</div>
			<CallboardTable
				actors={actors}
				shows={shows}
				attendance={attendance}
				onSetStatus={handleSetStatus}
				highlightNextUpcoming
			/>
		</div>
	);
}

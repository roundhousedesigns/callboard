import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { CallboardTable } from '../../components/CallboardTable';
import type { Show, AttendanceRecord } from '../../components/CallboardTable';
import type { User } from '../../lib/auth';
import { api } from '../../lib/api';
import {
	toLocalDateStr,
	getWeekBoundsWithStart,
	getTodayStart,
} from '../../lib/dateUtils';

/**
 * Week range for callboard: first show must be on or after the week-start day of the
 * current week, and no past shows. So we use the later of (week-start date, today).
 */
function getThisWeekRange(weekStartsOn: number) {
	const now = new Date();
	const { start: weekStart } = getWeekBoundsWithStart(now, weekStartsOn);
	const todayStart = getTodayStart();
	// Don't show past shows: start from the later of week-start or today
	const effectiveStart =
		weekStart.getTime() >= todayStart.getTime() ? weekStart : todayStart;
	const end = new Date(effectiveStart);
	end.setDate(end.getDate() + 13);
	return {
		start: toLocalDateStr(effectiveStart),
		end: toLocalDateStr(end),
	};
}

export function CallboardPage() {
	const { user } = useAuth();
	const [actors, setActors] = useState<User[]>([]);
	const [shows, setShows] = useState<Show[]>([]);
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [dateRange, setDateRange] = useState({ start: '', end: '' });

	const showsPerWeek = 8;
	const weekStartsOn = user?.organization?.weekStartsOn ?? 0;

	useEffect(() => {
		setDateRange(getThisWeekRange(weekStartsOn));
	}, [weekStartsOn]);

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
			// Only include shows on or after the range start (week-start or today, whichever is later) and no past shows
			const rangeStartStr = dateRange.start;
			const todayStr = toLocalDateStr(getTodayStart());
			const showsInRange = showsRes.filter((s) => {
				const showDateStr = s.date.slice(0, 10);
				return showDateStr >= rangeStartStr && showDateStr >= todayStr;
			});
			setShows(showsInRange.slice(0, showsPerWeek));

			const allAttendance: AttendanceRecord[] = [];
			const showsToUse = showsInRange.slice(0, showsPerWeek);
			for (const show of showsToUse) {
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
		setDateRange(getThisWeekRange(weekStartsOn));
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

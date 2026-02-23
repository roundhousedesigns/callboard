import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { CallboardTable } from '../../components/CallboardTable';
import type { Show, AttendanceRecord } from '../../components/CallboardTable';
import type { User } from '../../lib/auth';
import { api } from '../../lib/api';
import {
	toLocalDateStr,
	getWeekBoundsWithStart,
} from '../../lib/dateUtils';
import { Button, TextFieldInput } from '../../components/ui';

/**
 * Week range for callboard: the full week containing "today", where "week" starts on
 * the organization-configured start day.
 */
function getThisWeekRange(weekStartsOn: number) {
	const now = new Date();
	const { start: weekStart } = getWeekBoundsWithStart(now, weekStartsOn);
	const end = new Date(weekStart);
	end.setDate(end.getDate() + 6);
	return {
		start: toLocalDateStr(weekStart),
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
			// Only include shows on or after the range start (week start by default)
			const rangeStartStr = dateRange.start;
			const rangeEndStr = dateRange.end;
			const showsInRange = showsRes.filter((s) => {
				const showDateStr = s.date.slice(0, 10);
				return showDateStr >= rangeStartStr && showDateStr <= rangeEndStr;
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
					<TextFieldInput
						label="Start"
						value={dateRange.start}
						onChange={(value) => setDateRange((p) => ({ ...p, start: value }))}
						inputProps={{ type: 'date' }}
					/>
					<TextFieldInput
						label="End"
						value={dateRange.end}
						onChange={(value) => setDateRange((p) => ({ ...p, end: value }))}
						inputProps={{ type: 'date' }}
					/>
					<Button
						size="sm"
						type="button"
						onPress={setThisWeek}
					>
						This Week
					</Button>
					<Button
						size="sm"
						variant="ghost"
						type="button"
						onPress={() => {
							void loadData(false);
						}}
						isDisabled={refreshing || loading}
					>
						{refreshing ? 'Refreshing...' : 'Refresh'}
					</Button>
					<Button
						size="sm"
						variant="primary"
						type="button"
						onPress={handlePrint}
					>
						Print report
					</Button>
				</div>
			</div>
			<CallboardTable
				actors={actors}
				shows={shows}
				attendance={attendance}
				onSetStatus={(userId, showId, status) => {
					void handleSetStatus(userId, showId, status);
				}}
				highlightNextUpcoming
			/>
		</div>
	);
}

import { useState, useEffect, useRef } from 'react';
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

function fromLocalDateStr(yyyyMmDd: string): Date {
	const [y, m, d] = yyyyMmDd.split('-').map(Number);
	return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function CallboardPage() {
	const { user } = useAuth();
	const [actors, setActors] = useState<User[]>([]);
	const [shows, setShows] = useState<Show[]>([]);
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [dateRange, setDateRange] = useState({ start: '', end: '' });
	const [draftRange, setDraftRange] = useState({ start: '', end: '' });
	const hasLoadedOnceRef = useRef(false);

	const showsPerWeek = 8;
	const weekStartsOn = user?.organization?.weekStartsOn ?? 0;

	useEffect(() => {
		const thisWeek = getThisWeekRange(weekStartsOn);
		setDateRange(thisWeek);
		setDraftRange(thisWeek);
	}, [weekStartsOn]);

	const loadData = async (showLoading = true) => {
		if (!dateRange.start) return;
		const useFullLoading = showLoading && !hasLoadedOnceRef.current;
		if (useFullLoading) setLoading(true);
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
			hasLoadedOnceRef.current = true;
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		void loadData(true);
	}, [dateRange.start, dateRange.end]);

	useEffect(() => {
		if (!dateRange.start) return;
		const interval = setInterval(() => {
			if (document.visibilityState === 'visible') {
				loadData(false);
			}
		}, 30000);
		return () => {
			clearInterval(interval);
		};
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
		const thisWeek = getThisWeekRange(weekStartsOn);
		setDateRange(thisWeek);
		setDraftRange(thisWeek);
	}

	function shiftWeek(deltaWeeks: number) {
		if (!dateRange.start) return;
		const reference = fromLocalDateStr(dateRange.start);
		reference.setDate(reference.getDate() + deltaWeeks * 7);
		const { start: weekStart } = getWeekBoundsWithStart(reference, weekStartsOn);
		const end = new Date(weekStart);
		end.setDate(end.getDate() + 6);
		const nextRange = {
			start: toLocalDateStr(weekStart),
			end: toLocalDateStr(end),
		};
		setDateRange(nextRange);
		setDraftRange(nextRange);
	}

	function applyDraftRange() {
		if (!draftRange.start || !draftRange.end) return;
		setDateRange({ start: draftRange.start, end: draftRange.end });
	}

	function handlePrint() {
		window.print();
	}

	const displayTitle =
		user?.organization?.showTitle ?? user?.organization?.name ?? 'Callboard';

	const isDraftDirty = draftRange.start !== dateRange.start || draftRange.end !== dateRange.end;

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
					<Button
						size="sm"
						variant="ghost"
						type="button"
						onPress={() => shiftWeek(-1)}
						isDisabled={refreshing || loading}
					>
						Previous week
					</Button>
					<Button
						size="sm"
						variant="ghost"
						type="button"
						onPress={() => shiftWeek(1)}
						isDisabled={refreshing || loading}
					>
						Next week
					</Button>
					<TextFieldInput
						label="Start"
						value={draftRange.start}
						onChange={(value) => {
							setDraftRange((p) => ({ ...p, start: value }));
						}}
						inputProps={{ type: 'date' }}
					/>
					<TextFieldInput
						label="End"
						value={draftRange.end}
						onChange={(value) => {
							setDraftRange((p) => ({ ...p, end: value }));
						}}
						inputProps={{ type: 'date' }}
					/>
					<Button
						size="sm"
						variant="primary"
						type="button"
						onPress={applyDraftRange}
						isDisabled={!draftRange.start || !draftRange.end || !isDraftDirty || refreshing || loading}
					>
						Apply range
					</Button>
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
			{loading && <div className="muted">Loading...</div>}
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

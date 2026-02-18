import { useState, useEffect, useRef } from 'react';
import { CallboardTable } from '../../components/CallboardTable';
import type { Show, AttendanceRecord } from '../../components/CallboardTable';
import type { User } from '../../lib/auth';
import { api } from '../../lib/api';
import { toLocalDateStr } from '../../lib/dateUtils';

export function ReportsPage() {
	const [actors, setActors] = useState<User[]>([]);
	const [shows, setShows] = useState<Show[]>([]);
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [dateRange, setDateRange] = useState({ start: '', end: '' });
	const reportRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const monthStart = new Date();
		monthStart.setDate(1);
		const monthEnd = new Date(monthStart);
		monthEnd.setMonth(monthEnd.getMonth() + 1);
		monthEnd.setDate(0);
		setDateRange({
			start: toLocalDateStr(monthStart),
			end: toLocalDateStr(monthEnd),
		});
	}, []);

	useEffect(() => {
		if (!dateRange.start) return;
		let cancelled = false;
		async function load() {
			try {
				const [usersRes, showsRes] = await Promise.all([
					api.get<User[]>('/users'),
					api.get<Show[]>(`/shows?start=${dateRange.start}&end=${dateRange.end || '2099-12-31'}`),
				]);
				if (cancelled) return;
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
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [dateRange.start, dateRange.end]);

	function handlePrint() {
		window.print();
	}

	if (loading) return <div>Loading...</div>;

	return (
		<div>
			<h1>Attendance Report</h1>
			<div
				className="no-print"
				style={{
					display: 'flex',
					gap: '1rem',
					marginBottom: '1rem',
					flexWrap: 'wrap',
				}}
			>
				<label>
					Start:{' '}
					<input
						type="date"
						value={dateRange.start}
						onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
					/>
				</label>
				<label>
					End:{' '}
					<input
						type="date"
						value={dateRange.end}
						onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
					/>
				</label>
				<button onClick={handlePrint}>Print report</button>
			</div>
			<div ref={reportRef}>
				<CallboardTable actors={actors} shows={shows} attendance={attendance} readOnly />
			</div>
		</div>
	);
}

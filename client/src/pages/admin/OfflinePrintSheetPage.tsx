import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { CallboardTable } from '../../components/CallboardTable';
import type { Show, AttendanceRecord } from '../../components/CallboardTable';
import type { User } from '../../lib/auth';
import { api } from '../../lib/api';
import { toLocalDateStr } from '../../lib/dateUtils';
import { db } from '../../lib/offlineDb';

export function OfflinePrintSheetPage() {
	const { user } = useAuth();
	const [actors, setActors] = useState<User[]>([]);
	const [shows, setShows] = useState<Show[]>([]);
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [online, setOnline] = useState(navigator.onLine);
	const [dateRange, setDateRange] = useState({ start: '', end: '' });

	useEffect(() => {
		const today = new Date();
		setDateRange({
			start: toLocalDateStr(today),
			end: toLocalDateStr(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)),
		});
	}, []);

	useEffect(() => {
		const handleOnline = () => setOnline(true);
		const handleOffline = () => setOnline(false);
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			if (online) {
				try {
					const [usersRes, showsRes] = await Promise.all([
						api.get<User[]>('/users'),
						api.get<Show[]>(
							`/shows?start=${dateRange.start || '1970-01-01'}&end=${dateRange.end || '2099-12-31'}`,
						),
					]);
					if (cancelled) return;
					const actorList = usersRes.filter((u) => u.role === 'actor');
					setActors(actorList);
					setShows(showsRes);

					await db.actors.clear();
					await db.shows.clear();
					const now = Date.now();
					await db.actors.bulkAdd(
						actorList.map((a) => ({
							id: a.id,
							firstName: a.firstName,
							lastName: a.lastName,
							syncedAt: now,
						})),
					);
					await db.shows.bulkAdd(
						showsRes.map((s) => ({
							id: s.id,
							date:
								typeof s.date === 'string'
									? s.date.slice(0, 10)
									: new Date(s.date).toISOString().slice(0, 10),
							showTime: s.showTime,
							syncedAt: now,
						})),
					);

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
				}
			} else {
				const offlineActors = await db.actors.orderBy('lastName').toArray();
				const allShows = await db.shows.toArray();
				const offlineShows = allShows
					.filter(
						(s) =>
							s.date >= (dateRange.start || '1970-01-01') &&
							s.date <= (dateRange.end || '2099-12-31'),
					)
					.sort(
						(a, b) =>
							a.date.localeCompare(b.date) ||
							(a.showTime ?? (a as { label?: string }).label ?? '').localeCompare(
								b.showTime ?? (b as { label?: string }).label ?? '',
							),
					);

				setActors(
					offlineActors.map((a) => ({
						id: a.id,
						email: '',
						firstName: a.firstName,
						lastName: a.lastName,
						role: 'actor' as const,
						organizationId: '',
					})),
				);
				setShows(
					offlineShows.map((s) => ({
						id: s.id,
						date: s.date,
						showTime: s.showTime ?? (s as { label?: string }).label ?? '',
						activeAt: null,
						lockedAt: null,
						signInToken: null,
					})),
				);
				setAttendance([]);
			}
			if (!cancelled) setLoading(false);
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [online, dateRange.start, dateRange.end]);

	function handlePrint() {
		window.print();
	}

	if (loading) return <div>Loading...</div>;

	const displayTitle =
		user?.organization?.showTitle ?? user?.organization?.name ?? 'Offline Attendance Sheet';

	return (
		<div>
			<h1>{displayTitle}</h1>
			<p style={{ color: 'var(--text-muted)', marginTop: '-0.5rem' }}>Offline Attendance Sheet</p>
			<p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
				{online
					? 'You are online. Data is synced. Use this page to print a sheet before going offline.'
					: 'You are offline. This sheet uses cached data. Mark sign-ins on paper, then use Manual Entry when back online.'}
			</p>
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
				<button onClick={handlePrint}>Print sheet</button>
				{online && (
					<a href="/admin/manual-entry" style={{ alignSelf: 'center' }}>
						Enter manual sign-ins
					</a>
				)}
			</div>
			<div
				style={{
					padding: '1rem',
					background: 'var(--bg-elevated)',
					borderRadius: '6px',
					marginBottom: '1rem',
				}}
			>
				<p style={{ margin: 0, fontSize: '0.9rem' }}>
					<strong>Instructions when offline:</strong> Print this sheet. As actors arrive, mark their
					sign-in on the printed sheet. When internet is restored, go to Manual Entry to submit the
					sign-ins.
				</p>
			</div>
			<CallboardTable actors={actors} shows={shows} attendance={attendance} readOnly />
		</div>
	);
}

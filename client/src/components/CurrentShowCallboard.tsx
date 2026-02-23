import { useEffect, useState } from 'react';
import { CallboardTable, type Actor, type AttendanceRecord, type Show } from './CallboardTable';

export interface CurrentShowCallboardData {
	show: Show;
	actors: Actor[];
	attendance: AttendanceRecord[];
}

export function CurrentShowCallboard({
	heading,
	readOnly,
	load,
	onSetStatus,
}: {
	heading?: React.ReactNode;
	readOnly: boolean;
	load: () => Promise<CurrentShowCallboardData>;
	onSetStatus?: (userId: string, showId: string, status: AttendanceRecord['status'] | null) => void;
}) {
	const [data, setData] = useState<CurrentShowCallboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [noActiveShow, setNoActiveShow] = useState(false);

	const runLoad = async () => {
		try {
			setError(null);
			setNoActiveShow(false);
			const res = await load();
			setData(res);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to load callboard';
			setData(null);
			if (msg.toLowerCase().includes('no active show')) {
				setNoActiveShow(true);
			} else {
				setError(msg);
			}
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		let cancelled = false;

		const guardedLoad = async () => {
			if (cancelled) return;
			await runLoad();
		};

		void guardedLoad();

		const interval = window.setInterval(() => {
			if (document.visibilityState === 'visible') {
				void guardedLoad();
			}
		}, 30000);

		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				void guardedLoad();
			}
		};
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			cancelled = true;
			window.clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}, [load]);

	if (loading) return <div className="muted">Loading...</div>;

	if (noActiveShow) {
		return (
			<div className="card card--flat" style={{ maxWidth: '60rem' }}>
				{heading ? <h2 style={{ marginTop: 0 }}>{heading}</h2> : null}
				<p className="muted" style={{ margin: 0 }}>
					No active show right now.
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="card card--flat" style={{ maxWidth: '60rem' }}>
				{heading ? <h2 style={{ marginTop: 0 }}>{heading}</h2> : null}
				<div className="alert alert--error">{error}</div>
			</div>
		);
	}

	if (!data) return null;

	const handleSetStatus = readOnly
		? undefined
		: (userId: string, showId: string, status: AttendanceRecord['status'] | null) => {
				void Promise.resolve(onSetStatus?.(userId, showId, status)).catch((err) => {
					console.error(err);
				});
				setData((prev) => {
					if (!prev) return prev;
					const rest = prev.attendance.filter((a) => !(a.userId === userId && a.showId === showId));
					return {
						...prev,
						attendance:
							status === null ? rest : [...rest, { userId, showId, status }],
					};
				});
			};

	return (
		<div>
			{heading ? <h2 style={{ marginTop: 0 }}>{heading}</h2> : null}
			<CallboardTable
				actors={data.actors}
				shows={[data.show]}
				attendance={data.attendance}
				readOnly={readOnly}
				onSetStatus={handleSetStatus}
			/>
		</div>
	);
}


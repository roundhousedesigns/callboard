import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CallboardTable, type Actor, type AttendanceRecord, type Show } from './CallboardTable';

interface ActiveCallboardResponse {
	show: Show;
	actors: Actor[];
	attendance: AttendanceRecord[];
}

export function ActiveShowCallboard({
	heading,
}: {
	heading?: React.ReactNode;
}) {
	const [data, setData] = useState<ActiveCallboardResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [noActiveShow, setNoActiveShow] = useState(false);

	const load = async () => {
		try {
			setError(null);
			setNoActiveShow(false);
			const res = await api.get<ActiveCallboardResponse>('/actor/callboard/active');
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
			await load();
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
	}, []);

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

	return (
		<div>
			{heading ? <h2 style={{ marginTop: 0 }}>{heading}</h2> : null}
			<CallboardTable
				actors={data.actors}
				shows={[data.show]}
				attendance={data.attendance}
				readOnly
			/>
		</div>
	);
}


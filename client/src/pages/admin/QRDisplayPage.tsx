import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../lib/api';
import { formatShowTime } from '../../lib/dateUtils';
import { Button } from '../../components/ui';

interface Show {
	id: string;
	date: string;
	showTime: string;
	activeAt: string | null;
	lockedAt: string | null;
	signInToken: string | null;
}

export function QRDisplayPage() {
	const [show, setShow] = useState<Show | null>(null);
	const [error, setError] = useState<string | null>(null);

	function loadActiveShow() {
		setError(null);
		api
			.get<Show | null>('/shows/active')
			.then((s) => {
				if (!s) {
					setShow(null);
					setError('No active show');
					return;
				}
				setShow(s);
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : 'Failed');
				setShow(null);
			});
	}

	useEffect(() => {
		loadActiveShow();
	}, []);

	if (error) {
		const isNoActive = error.toLowerCase().includes('no active show');
		return (
			<div className="centered">
				<div className="card auth-card stack" style={{ maxWidth: '460px', textAlign: 'center' }}>
					<h2 style={{ color: isNoActive ? 'var(--text-muted)' : 'var(--error)', margin: 0 }}>
						{isNoActive ? 'No active show' : error}
					</h2>
					{isNoActive && (
						<p className="muted" style={{ margin: 0 }}>
							Open sign-in for a show from the Shows page to display the QR code.
						</p>
					)}
					<Button
						className="no-print"
						variant="primary"
						type="button"
						onPress={loadActiveShow}
					>
						Refresh
					</Button>
				</div>
			</div>
		);
	}
	if (!show) return <div className="muted">Loading...</div>;
	if (!show.signInToken) {
		return (
			<div>
				<div className="alert">
					<p style={{ margin: 0 }}>
						No active show. Open sign-in for a show from the Shows page first.
					</p>
				</div>
			</div>
		);
	}
	if (show.lockedAt) {
		return (
			<div>
				<h2 style={{ marginBottom: '0.25rem' }}>No active show</h2>
				<p className="muted">
					{new Date(show.date).toLocaleDateString()} — {formatShowTime(show.showTime)}
				</p>
				<p>This show has been closed for sign-in.</p>
			</div>
		);
	}

	const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
	const signInUrl = `${baseUrl}/s/${show.signInToken}`;

	return (
		<div className="centered">
			<div className="card auth-card stack" style={{ maxWidth: '520px', textAlign: 'center' }}>
				<div>
					<h1 className="auth-title">Scan to sign in</h1>
					<p className="auth-subtitle">
						{new Date(show.date).toLocaleDateString()} — {formatShowTime(show.showTime)}
					</p>
				</div>
				<Button
					className="no-print"
					variant="primary"
					type="button"
					onPress={() => {
						window.print();
					}}
				>
					Print QR sheet
				</Button>
				<div className="qr-box" style={{ margin: '0 auto' }}>
					<QRCodeSVG value={signInUrl} size={256} level="H" />
				</div>
				<p className="muted" style={{ fontSize: '0.95rem', margin: 0 }}>
					Actors must be logged in to sign in.
				</p>
			</div>
		</div>
	);
}

import { useState, useEffect } from 'react';
import { Button, Callout, Card, Elevation, H3, Spinner } from '@blueprintjs/core';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../lib/api';
import { formatShowTime } from '../../lib/dateUtils';

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
			.get<Show>('/shows/active')
			.then(setShow)
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
			<div className="page-centered">
				<Card elevation={Elevation.TWO} className="auth-card form-stack">
					<H3>{isNoActive ? 'No active show' : 'Unable to load active show'}</H3>
					<Callout intent={isNoActive ? 'warning' : 'danger'}>
						{isNoActive
							? 'Open sign-in for a show from the Shows page to display the QR code.'
							: error}
					</Callout>
					<Button className="no-print" intent="primary" text="Refresh" onClick={loadActiveShow} />
				</Card>
			</div>
		);
	}

	if (!show) {
		return (
			<div className="page-centered">
				<Spinner size={28} />
			</div>
		);
	}

	if (!show.signInToken) {
		return (
			<Callout intent="warning">
				No active show. Open sign-in for a show from the Shows page first.
			</Callout>
		);
	}

	if (show.lockedAt) {
		return (
			<Card elevation={Elevation.ONE} className="form-stack">
				<H3>No active show</H3>
				<p className="page-subtitle">
					{new Date(show.date).toLocaleDateString()} — {formatShowTime(show.showTime)}
				</p>
				<Callout intent="warning">This show has been closed for sign-in.</Callout>
			</Card>
		);
	}

	const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
	const signInUrl = `${baseUrl}/s/${show.signInToken}`;

	return (
		<div className="page-centered">
			<Card elevation={Elevation.TWO} className="auth-card form-stack qr-page-card">
				<div className="text-center">
					<H3 className="auth-title">Scan to sign in</H3>
					<p className="auth-subtitle">
						{new Date(show.date).toLocaleDateString()} — {formatShowTime(show.showTime)}
					</p>
				</div>
				<Button
					className="no-print"
					intent="primary"
					text="Print QR sheet"
					onClick={() => window.print()}
				/>
				<div className="qr-box">
					<QRCodeSVG value={signInUrl} size={256} level="H" />
				</div>
				<p className="page-subtitle text-center">
					Actors must be logged in to sign in.
				</p>
			</Card>
		</div>
	);
}

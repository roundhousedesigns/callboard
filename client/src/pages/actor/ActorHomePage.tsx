import { useAuth } from '../../lib/auth';
import { Card, Elevation, H3 } from '@blueprintjs/core';

// This page does not trigger sign-in. Actors must sign in by scanning the QR code (/s/:token).
export function ActorHomePage() {
	const { user } = useAuth();

	return (
		<div className="auth-shell">
			<Card elevation={Elevation.TWO} className="auth-card form-stack">
				<H3 className="auth-title">Callboard</H3>
				<p className="page-subtitle text-center">
					You're signed in as{' '}
					<strong>
						{user?.firstName} {user?.lastName}
					</strong>
					.
				</p>
				<p className="page-subtitle text-center">
					Scan the QR code at the callboard to sign in for a show.
				</p>
			</Card>
		</div>
	);
}

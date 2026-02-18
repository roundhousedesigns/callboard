import { useAuth } from '../../lib/auth';

// This page does not trigger sign-in. Actors must sign in by scanning the QR code (/s/:token).
export function ActorHomePage() {
	const { user } = useAuth();

	return (
		<div className="auth-shell">
			<div className="card auth-card stack" style={{ maxWidth: '420px' }}>
				<h1 className="auth-title">Callboard</h1>
				<p className="muted" style={{ textAlign: 'center' }}>
					You're signed in as{' '}
					<strong>
						{user?.firstName} {user?.lastName}
					</strong>
					.
				</p>
				<p className="muted" style={{ textAlign: 'center' }}>
					Scan the QR code at the callboard to sign in for a show.
				</p>
			</div>
		</div>
	);
}

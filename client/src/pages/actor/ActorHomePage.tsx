import { useAuth } from '../../lib/auth';

// This page does not trigger sign-in. Actors must sign in by scanning the QR code (/s/:token).
export function ActorHomePage() {
	const { user } = useAuth();

	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '1rem',
			}}
		>
			<h1>Callboard</h1>
			<p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '320px' }}>
				You're signed in as {user?.firstName} {user?.lastName}.
			</p>
			<p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '320px' }}>
				Scan the QR code at the callboard to sign in for a show.
			</p>
		</div>
	);
}

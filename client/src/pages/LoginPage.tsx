import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const { login, user } = useAuth();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const redirect = searchParams.get('redirect');
	// Actors go to /actor; never auto sign them into the active show (they must use the QR flow).
	const defaultRedirect = user?.role === 'admin' ? '/admin' : '/actor';

	if (user) {
		navigate(redirect ?? defaultRedirect, { replace: true });
		return null;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const u = await login(email, password);
			const target = redirect ?? (u.role === 'admin' ? '/admin' : '/actor');
			navigate(target, { replace: true });
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Login failed');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '1rem',
			}}
		>
			<form
				onSubmit={handleSubmit}
				style={{
					width: '100%',
					maxWidth: '320px',
					display: 'flex',
					flexDirection: 'column',
					gap: '1rem',
				}}
			>
				<h1 style={{ margin: 0, textAlign: 'center' }}>Callboard</h1>
				<p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
					Sign in to your account
				</p>
				{error && <div style={{ color: 'var(--error)', fontSize: '0.9rem' }}>{error}</div>}
				<input
					type="email"
					placeholder="Email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					autoComplete="email"
				/>
				<input
					type="password"
					placeholder="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					autoComplete="current-password"
				/>
				<button type="submit" disabled={loading}>
					{loading ? 'Signing in...' : 'Sign in'}
				</button>
			</form>
		</div>
	);
}

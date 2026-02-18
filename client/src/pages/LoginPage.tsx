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
		<div className="auth-shell">
			<form
				onSubmit={handleSubmit}
				className="card auth-card stack"
			>
				<div>
					<h1 className="auth-title">Callboard</h1>
					<p className="auth-subtitle">Sign in to your account</p>
				</div>
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
				<button className="btn btn--primary" type="submit" disabled={loading}>
					{loading ? 'Signing in...' : 'Sign in'}
				</button>
			</form>
		</div>
	);
}

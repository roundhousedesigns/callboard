import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Callout, Card, Elevation, FormGroup, H2, InputGroup } from '@blueprintjs/core';
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

	useEffect(() => {
		if (user) {
			navigate(redirect ?? defaultRedirect, { replace: true });
		}
	}, [user, redirect, defaultRedirect, navigate]);

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

	if (user) return null;

	return (
		<div className="auth-shell">
			<Card elevation={Elevation.TWO} className="auth-card">
				<form onSubmit={handleSubmit} className="form-stack">
					<div>
						<H2 className="auth-title">Callboard</H2>
						<p className="auth-subtitle">Sign in to your account</p>
					</div>
					{error && <Callout intent="danger">{error}</Callout>}
					<FormGroup label="Email" labelFor="login-email">
						<InputGroup
							id="login-email"
							type="email"
							placeholder="Email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoComplete="email"
						/>
					</FormGroup>
					<FormGroup label="Password" labelFor="login-password">
						<InputGroup
							id="login-password"
							type="password"
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							autoComplete="current-password"
						/>
					</FormGroup>
					<Button intent="primary" type="submit" loading={loading} fill>
						{loading ? 'Signing in...' : 'Sign in'}
					</Button>
				</form>
			</Card>
		</div>
	);
}

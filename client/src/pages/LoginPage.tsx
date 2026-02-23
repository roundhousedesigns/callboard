import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, TextFieldInput } from '../components/ui';

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
		if (!user) return;
		navigate(redirect ?? defaultRedirect, { replace: true });
	}, [defaultRedirect, navigate, redirect, user]);

	if (user) return null;

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
				{error && <div className="alert alert--error">{error}</div>}
				<TextFieldInput
					aria-label="Email"
					value={email}
					onChange={setEmail}
					isRequired
					inputProps={{
						type: 'email',
						placeholder: 'Email',
						autoComplete: 'email',
					}}
				/>
				<TextFieldInput
					aria-label="Password"
					value={password}
					onChange={setPassword}
					isRequired
					inputProps={{
						type: 'password',
						placeholder: 'Password',
						autoComplete: 'current-password',
					}}
				/>
				<Button
					variant="primary"
					type="submit"
					isDisabled={loading}
				>
					{loading ? 'Signing in...' : 'Sign in'}
				</Button>
			</form>
		</div>
	);
}

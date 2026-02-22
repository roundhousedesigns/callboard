import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { formatShowTime } from '../../lib/dateUtils';
import { ActiveShowCallboard } from '../../components/ActiveShowCallboard';

interface SignInResult {
	success: boolean;
	show?: { date: string; showTime: string };
}

export function SignInLandingPage() {
	const { token } = useParams<{ token: string }>();
	const navigate = useNavigate();
	const { user, loading } = useAuth();
	const [result, setResult] = useState<SignInResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!token) return;
		if (loading) return;

		if (!user) {
			navigate(`/login?redirect=${encodeURIComponent(`/s/${token}`)}`, {
				replace: true,
			});
			return;
		}

		if (user.role !== 'actor') {
			navigate('/admin', { replace: true });
			return;
		}

		let cancelled = false;
		api
			.get<SignInResult>(`/sign-in/${token}`)
			.then((data) => {
				if (!cancelled) setResult(data);
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : 'Sign-in failed');
			});

		return () => {
			cancelled = true;
		};
	}, [token, user, loading, navigate]);

	if (loading || (!result && !error)) {
		return (
			<div className="auth-shell">
				<div className="card auth-card" style={{ textAlign: 'center' }}>
					<p className="muted" style={{ margin: 0 }}>
						Processing sign-in...
					</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="auth-shell">
				<div className="card auth-card stack" style={{ textAlign: 'center' }}>
					<h2 style={{ color: 'var(--error)', margin: 0 }}>Sign-in failed</h2>
					<p className="muted" style={{ margin: 0 }}>
						{error}
					</p>
				</div>
			</div>
		);
	}

	const showLabel = result?.show
		? `${new Date(result.show.date).toLocaleDateString()} - ${formatShowTime(result.show.showTime)}`
		: 'this show';

	return (
		<div className="auth-shell">
			<div className="stack" style={{ width: 'min(70rem, 100%)', margin: '0 auto' }}>
				<div className="card auth-card stack" style={{ textAlign: 'center' }}>
					<h2 style={{ color: 'var(--success)', margin: 0 }}>You're signed in</h2>
					<p className="muted" style={{ margin: 0 }}>
						{`Successfully signed in for ${showLabel}.`}
					</p>
				</div>
				<ActiveShowCallboard heading="Current callboard" />
			</div>
		</div>
	);
}

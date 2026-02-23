import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Callout, Card, Elevation, H3, Spinner } from '@blueprintjs/core';
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
				<Card elevation={Elevation.TWO} className="auth-card form-stack text-center">
					<Spinner size={24} />
					<p className="page-subtitle">Processing sign-in...</p>
				</Card>
			</div>
		);
	}

	if (error) {
		return (
			<div className="auth-shell">
				<Card elevation={Elevation.TWO} className="auth-card form-stack text-center">
					<H3>Sign-in failed</H3>
					<Callout intent="danger">{error}</Callout>
				</Card>
			</div>
		);
	}

	const showLabel = result?.show
		? `${new Date(result.show.date).toLocaleDateString()} - ${formatShowTime(result.show.showTime)}`
		: 'this show';

	return (
		<div className="auth-shell">
			<div className="wide-stack">
				<Card elevation={Elevation.TWO} className="auth-card form-stack text-center">
					<H3>You're signed in</H3>
					<Callout intent="success">{`Successfully signed in for ${showLabel}.`}</Callout>
				</Card>
				<ActiveShowCallboard heading="Current callboard" />
			</div>
		</div>
	);
}

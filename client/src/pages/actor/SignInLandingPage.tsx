import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { formatShowTime } from '../../lib/dateUtils';

interface SignInResult {
	success: boolean;
	alreadySignedIn?: boolean;
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
		return <div style={{ padding: '2rem', textAlign: 'center' }}>Processing sign-in...</div>;
	}

	if (error) {
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
				<h2 style={{ color: 'var(--error)' }}>Sign-in Failed</h2>
				<p>{error}</p>
			</div>
		);
	}

	const showLabel = result?.show
		? `${new Date(result.show.date).toLocaleDateString()} - ${formatShowTime(result.show.showTime)}`
		: 'this show';

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
			<h2 style={{ color: 'var(--success)' }}>You're signed in!</h2>
			<p>
				{result?.alreadySignedIn
					? `You had already signed in for ${showLabel}.`
					: `Successfully signed in for ${showLabel}.`}
			</p>
		</div>
	);
}

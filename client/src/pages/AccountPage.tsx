import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Button } from '../components/ui';

export function AccountPage() {
	const { user, logout, refresh } = useAuth();
	const navigate = useNavigate();
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState('');

	async function handleCreateCompany() {
		setError('');
		setCreating(true);
		try {
			const name = prompt('Company name:');
			if (!name?.trim()) return;
			const slug = name
				.trim()
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9-]/g, '');
			if (!slug) {
				setError('Invalid company name');
				return;
			}
			const org = await api.post<{ id: string; slug: string }>('/organizations', {
				name: name.trim(),
				slug: slug || `company-${Date.now()}`,
			});
			await refresh();
			navigate(`/admin/${org.slug}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create company');
		} finally {
			setCreating(false);
		}
	}

	async function handleLogout() {
		await logout();
		navigate('/login');
	}

	if (!user) return null;

	const memberships = user.memberships ?? [];

	return (
		<div className="auth-shell" style={{ maxWidth: '36rem', margin: '0 auto' }}>
			<div className="card auth-card stack">
				<div>
					<h1 className="auth-title">Callboard</h1>
					<p className="auth-subtitle">Your account</p>
				</div>
				<p style={{ margin: 0 }}>
					{user.firstName} {user.lastName} ({user.email})
				</p>

				{error && <div className="alert alert--error">{error}</div>}

				{memberships.length === 0 ? (
					<div>
						<p>You have no companies. Create one to get started.</p>
						<Button
							variant="primary"
							onPress={() => void handleCreateCompany()}
							isDisabled={creating}
						>
							{creating ? 'Creating...' : 'Add Company'}
						</Button>
					</div>
				) : (
					<div className="stack" style={{ gap: '0.75rem' }}>
						<h2 style={{ margin: 0, fontSize: '1rem' }}>Your companies</h2>
						<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
							{memberships.map((m) => (
								<li
									key={m.organizationId}
									style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										justifyContent: 'flex-start',
										gap: '0.75rem',
										padding: '0.5rem 0',
										borderBottom: '1px solid var(--color-border)',
									}}
								>
									<div style={{ flex: 1 }}>
										<strong>{m.organization.showTitle ?? m.organization.name}</strong>
										<span
											className="badge"
											style={{
												marginLeft: '0.5rem',
												fontSize: '0.75rem',
												textTransform: 'capitalize',
											}}
										>
											{m.role}
										</span>
									</div>
									<div style={{ display: 'flex', gap: '0.5rem' }}>
										{(m.role === 'owner' || m.role === 'admin') && (
											<Button
												size="sm"
												variant="ghost"
												onPress={() => navigate(`/admin/${m.organization.slug}`)}
											>
												Admin
											</Button>
										)}
										{m.role === 'actor' && (
											<Button
												size="sm"
												variant="ghost"
												onPress={() => navigate(`/actor/${m.organization.slug}`)}
											>
												Callboard
											</Button>
										)}
										{(m.role === 'owner' || m.role === 'admin') && (
											<Button
												size="sm"
												variant="ghost"
												onPress={() => navigate(`/admin/${m.organization.slug}/current-show`)}
											>
												Current show
											</Button>
										)}
										{m.role !== 'actor' && (
											<Button
												size="sm"
												variant="ghost"
												onPress={() => navigate(`/actor/${m.organization.slug}`)}
											>
												Callboard
											</Button>
										)}
									</div>
								</li>
							))}
						</ul>
						<Button
							variant="primary"
							onPress={() => void handleCreateCompany()}
							isDisabled={creating}
						>
							{creating ? 'Creating...' : 'Add Company'}
						</Button>
					</div>
				)}

				<Button variant="ghost" onPress={() => void handleLogout()}>
					Log out
				</Button>
			</div>
		</div>
	);
}

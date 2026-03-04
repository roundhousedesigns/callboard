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
			const org = await api.post<{ id: string; slug: string }>('/companies', {
				name: name.trim(),
				slug: slug || `org-${Date.now()}`,
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

	const memberships = user.memberships;

	return (
		<div className="auth-shell auth-shell--account">
			<div className="surface auth-panel auth-panel--account stack">
				<div>
					<h1 className="auth-title">Callboard</h1>
					<p className="auth-subtitle">Your account</p>
				</div>
				<p className="u-m0">
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
					<div className="stack stack--md">
						<h2 className="account-section-title">Your companies</h2>
						<ul className="account-list">
							{memberships.map((m) => (
								<li key={m.companyId} className="account-item">
									<div className="account-item__identity">
										<strong>{m.company.showTitle ?? m.company.name}</strong>
										<span className="badge badge--role">
											{m.role}
										</span>
									</div>
									<div className="account-item__actions">
										{(m.role === 'owner' || m.role === 'admin') && (
											<Button
												size="sm"
												variant="ghost"
												onPress={() => navigate(`/admin/${m.company.slug}`)}
											>
												Admin
											</Button>
										)}
										{m.role === 'actor' && (
											<Button
												size="sm"
												variant="ghost"
												onPress={() => navigate(`/actor/${m.company.slug}`)}
											>
												Callboard
											</Button>
										)}
										{(m.role === 'owner' || m.role === 'admin') && (
											<Button
												size="sm"
												variant="ghost"
												onPress={() => navigate(`/admin/${m.company.slug}/current-show`)}
											>
												Current show
											</Button>
										)}
										{m.role !== 'actor' && (
											<Button
												size="sm"
												variant="ghost"
												onPress={() => navigate(`/actor/${m.company.slug}`)}
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

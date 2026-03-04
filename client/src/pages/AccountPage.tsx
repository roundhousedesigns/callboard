import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type Membership } from '../lib/auth';
import { api } from '../lib/api';
import { Button, TextFieldInput } from '../components/ui';

function OrganizationSettings({ membership, onDone }: { membership: Membership; onDone: () => void }) {
	const { refresh } = useAuth();
	const navigate = useNavigate();
	const [organizationName, setOrganizationName] = useState(membership.organization.name);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	async function handleRename(e: React.FormEvent) {
		e.preventDefault();
		if (!organizationName.trim()) return;
		setSaving(true);
		setMessage(null);
		try {
			await api.patch(`/organizations/${membership.organization.slug}`, { name: organizationName.trim() });
			await refresh();
			setMessage({ type: 'success', text: 'Organization renamed.' });
		} catch (err) {
			setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to rename' });
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!confirm(`Delete "${membership.organization.name}"? This cannot be undone.`)) return;
		try {
			await api.delete(`/organizations/${membership.organization.slug}`);
			await refresh();
			navigate('/account');
			onDone();
		} catch (err) {
			setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete' });
		}
	}

	return (
		<div className="stack">
			<form onSubmit={handleRename} className="stack">
				<TextFieldInput
					label="Organization name"
					value={organizationName}
					onChange={setOrganizationName}
					inputProps={{ placeholder: 'Organization name' }}
				/>
				{message && (
					<div className={`alert ${message.type === 'error' ? 'alert--error' : 'alert--success'}`}>
						{message.text}
					</div>
				)}
				<Button type="submit" variant="primary" isDisabled={saving || !organizationName.trim()}>
					{saving ? 'Saving...' : 'Rename organization'}
				</Button>
			</form>
			<Button variant="danger" onPress={() => void handleDelete()}>
				Delete organization
			</Button>
		</div>
	);
}

export function AccountPage() {
	const { user, logout, refresh } = useAuth();
	const navigate = useNavigate();
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState('');
	const [expandedOrgSlug, setExpandedOrgSlug] = useState<string | null>(null);

	async function handleCreateOrganization() {
		setError('');
		setCreating(true);
		try {
			const name = prompt('Organization name:');
			if (!name?.trim()) return;
			const slug = name
				.trim()
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9-]/g, '');
			if (!slug) {
				setError('Invalid organization name');
				return;
			}
			const org = await api.post<{ id: string; slug: string }>('/organizations', {
				name: name.trim(),
				slug: slug || `org-${Date.now()}`,
			});
			await refresh();
			navigate(`/admin/${org.slug}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create organization');
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
						<p>You have no organizations. Create one to get started.</p>
						<Button
							variant="primary"
							onPress={() => void handleCreateOrganization()}
							isDisabled={creating}
						>
							{creating ? 'Creating...' : 'Add Organization'}
						</Button>
					</div>
				) : (
					<div className="stack stack--md">
						<h2 className="account-section-title">Your organizations</h2>
						<ul className="account-list">
							{memberships.map((m) => (
								<li key={m.organizationId} className="account-item">
									<div className="account-item__identity">
										<strong>{m.organization.showTitle ?? m.organization.name}</strong>
										<span className="badge badge--role">
											{m.role}
										</span>
									</div>
									<div className="account-item__actions">
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
									{m.role === 'owner' && expandedOrgSlug === m.organization.slug && (
										<div className="account-item__settings">
											<OrganizationSettings
												membership={m}
												onDone={() => setExpandedOrgSlug(null)}
											/>
										</div>
									)}
								</li>
							))}
						</ul>
						<Button
							variant="primary"
							onPress={() => void handleCreateOrganization()}
							isDisabled={creating}
						>
							{creating ? 'Creating...' : 'Add Organization'}
						</Button>
					</div>
				)}

				{memberships.some((m) => m.role === 'owner') && (
					<Button
						size="sm"
						variant="ghost"
						onPress={() => {
							const ownerMembership = memberships.find((m) => m.role === 'owner');
							if (ownerMembership) {
								setExpandedOrgSlug((prev) =>
									prev === ownerMembership.organization.slug ? null : ownerMembership.organization.slug
								);
							}
						}}
					>
						{memberships.some((m) => m.role === 'owner' && expandedOrgSlug === m.organization.slug)
							? 'Cancel'
							: 'Organization settings'}
					</Button>
				)}

				<Button variant="ghost" onPress={() => void handleLogout()}>
					Log out
				</Button>
			</div>
		</div>
	);
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileTrigger } from 'react-aria-components';
import { api } from '../../lib/api';
import { useAuth, getMembership, isOwner } from '../../lib/auth';
import { formatShowTime } from '../../lib/dateUtils';
import { Button, Checkbox, SelectField, TextFieldInput } from '../../components/ui';
import { BulkShowCreator } from '../../components/BulkShowCreator';

interface OrgMember {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
}

interface ImportResult {
	createdCount: number;
	skippedCount: number;
	createdShows?: Array<{ date: string; showTime: string }>;
	skippedShows?: Array<{ date: string; showTime: string }>;
}

const WEEKDAY_OPTIONS: Array<{ value: number; label: string }> = [
	{ value: 0, label: 'Sunday' },
	{ value: 1, label: 'Monday' },
	{ value: 2, label: 'Tuesday' },
	{ value: 3, label: 'Wednesday' },
	{ value: 4, label: 'Thursday' },
	{ value: 5, label: 'Friday' },
	{ value: 6, label: 'Saturday' },
];

interface OrgSettings {
	showTitle: string | null;
	weekStartsOn: number | null;
}

export function SettingsPage() {
	const { orgSlug } = useParams<{ orgSlug: string }>();
	const navigate = useNavigate();
	const { user, refresh } = useAuth();
	const membership = orgSlug ? getMembership(user, orgSlug) : undefined;
	const canRenameDelete = orgSlug ? isOwner(user, orgSlug) : false;
	const [showTitle, setShowTitle] = useState('');
	const [weekStartsOn, setWeekStartsOn] = useState<number>(0);
	const [orgName, setOrgName] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [importFile, setImportFile] = useState<File | null>(null);
	const [skipDuplicates, setSkipDuplicates] = useState(true);
	const [importResult, setImportResult] = useState<ImportResult | null>(null);
	const [importLoading, setImportLoading] = useState(false);
	const [importError, setImportError] = useState<string | null>(null);
	const [fileTriggerKey, setFileTriggerKey] = useState(0);
	const [members, setMembers] = useState<OrgMember[]>([]);
	const [addEmail, setAddEmail] = useState('');
	const [addRole, setAddRole] = useState<'owner' | 'admin' | 'actor'>('actor');
	const [addMemberLoading, setAddMemberLoading] = useState(false);

	useEffect(() => {
		if (!orgSlug) return;
		async function load() {
			if (!orgSlug) return;
			try {
				const [settings, membersRes] = await Promise.all([
					api.org(orgSlug).get<OrgSettings>('/settings'),
					api.org(orgSlug).get<OrgMember[]>('/members'),
				]);
				setShowTitle(settings.showTitle ?? '');
				setWeekStartsOn(settings.weekStartsOn ?? 0);
				setMembers(membersRes);
			} catch (err) {
				setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load' });
			} finally {
				setLoading(false);
			}
		}
		void load();
	}, [orgSlug]);

	useEffect(() => {
		if (membership?.organization?.name) setOrgName(membership.organization.name);
	}, [membership?.organization?.name]);

	async function submitSettings() {
		if (!orgSlug) return;
		setMessage(null);
		setSaving(true);
		try {
			await api.org(orgSlug).patch('/settings', {
				showTitle: showTitle.trim() || null,
				weekStartsOn,
			});
			await refresh();
			setMessage({ type: 'success', text: 'Settings saved.' });
		} catch (err) {
			setMessage({
				type: 'error',
				text: err instanceof Error ? err.message : 'Failed to save',
			});
		} finally {
			setSaving(false);
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		void submitSettings();
	}

	async function importCalendar() {
		if (!importFile || !orgSlug) return;
		setImportError(null);
		setImportResult(null);
		setImportLoading(true);
		try {
			const formData = new FormData();
			formData.append('file', importFile);
			formData.append('skipDuplicates', String(skipDuplicates));

			const res = await fetch(`/api/organizations/${orgSlug}/shows/import`, {
				method: 'POST',
				credentials: 'include',
				body: formData,
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Import failed');
			setImportResult(data);
			setImportFile(null);
			setFileTriggerKey((prev) => prev + 1);
		} catch (err) {
			setImportError(err instanceof Error ? err.message : 'Import failed');
		} finally {
			setImportLoading(false);
		}
	}

	function handleImportSubmit(e: React.FormEvent) {
		e.preventDefault();
		void importCalendar();
	}

	async function handleRename(e: React.FormEvent) {
		e.preventDefault();
		if (!orgSlug || !canRenameDelete) return;
		setMessage(null);
		setSaving(true);
		try {
			await api.patch(`/organizations/${orgSlug}`, { name: orgName.trim() });
			await refresh();
			setMessage({ type: 'success', text: 'Company renamed.' });
		} catch (err) {
			setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to rename' });
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!orgSlug || !canRenameDelete) return;
		if (!confirm(`Delete "${membership?.organization?.name ?? orgName}"? This cannot be undone.`)) return;
		try {
			await api.delete(`/organizations/${orgSlug}`);
			await refresh();
			navigate('/account');
		} catch (err) {
			setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete' });
		}
	}

	async function handleAddMember(e: React.FormEvent) {
		e.preventDefault();
		if (!orgSlug || !addEmail.trim()) return;
		setAddMemberLoading(true);
		setMessage(null);
		try {
			const role = canRenameDelete ? addRole : 'actor';
			await api.org(orgSlug).post('/members', { email: addEmail.trim(), role });
			const membersRes = await api.org(orgSlug).get<OrgMember[]>('/members');
			setMembers(membersRes);
			setAddEmail('');
			setMessage({ type: 'success', text: 'Member added.' });
		} catch (err) {
			setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add member' });
		} finally {
			setAddMemberLoading(false);
		}
	}

	async function handleRemoveMember(memberId: string) {
		if (!orgSlug) return;
		if (!confirm('Remove this member?')) return;
		try {
			await api.org(orgSlug).delete(`/members/${memberId}`);
			setMembers((prev) => prev.filter((m) => m.id !== memberId));
			setMessage({ type: 'success', text: 'Member removed.' });
		} catch (err) {
			setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to remove' });
		}
	}

	if (loading) return <div className="muted">Loading...</div>;

	const displayOrgName = (membership?.organization?.name ?? orgName) || 'Organization';

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Settings</h1>
					<p className="page-subtitle">Organization: {displayOrgName}</p>
				</div>
				<div className="no-print">
					{orgSlug && (
						<BulkShowCreator
							orgSlug={orgSlug}
							triggerLabel="Build schedule"
							weekStartsOn={weekStartsOn}
						/>
					)}
				</div>
			</div>
			<div className="card card--flat" style={{ maxWidth: '34rem' }}>
				<form onSubmit={handleSubmit} className="stack">
					<div className="field">
						<TextFieldInput
							label="Show title"
							value={showTitle}
							onChange={setShowTitle}
							inputProps={{
								type: 'text',
								placeholder: displayOrgName,
							}}
						/>
						<p className="field-help">
							Displayed in header, reports, and printouts. Falls back to org name if empty.
						</p>
					</div>

					<div className="field" style={{ width: '12rem' }}>
						<SelectField
							label="Week starts on"
							selectedKey={String(weekStartsOn)}
							onSelectionChange={(key) => {
								setWeekStartsOn(Number(key));
							}}
							options={WEEKDAY_OPTIONS.map((opt) => ({
								id: String(opt.value),
								label: opt.label,
							}))}
						/>
						<p className="field-help">
							Callboard weekly view shows shows starting from this day.
						</p>
					</div>

					{message && (
						<div className={`alert ${message.type === 'error' ? 'alert--error' : 'alert--success'}`}>
							{message.text}
						</div>
					)}

					<Button
						variant="primary"
						type="submit"
						isDisabled={saving}
					>
						{saving ? 'Saving...' : 'Save settings'}
					</Button>
				</form>
			</div>

			<hr />

			<h2 style={{ marginBottom: '0.5rem' }}>Import Performance Calendar</h2>
			<p className="muted" style={{ marginBottom: '1rem' }}>
				Upload a CSV (<code>.csv</code>) with headers. Required columns: <code>date</code> (YYYY-MM-DD)
				and <code>showTime</code> (or <code>time</code>). Time accepts 24h <code>HH:mm</code> (or{' '}
				<code>HH:mm:ss</code>) or 12h with AM/PM (e.g. <code>2:00 PM</code>). Also accepts{' '}
				<code>matinee</code>, <code>evening</code>, <code>noon</code>, <code>midnight</code>.
			</p>
			<div className="card card--flat" style={{ maxWidth: '34rem' }}>
				<form onSubmit={handleImportSubmit} className="stack">
					<div className="stack" style={{ gap: '0.4rem' }}>
						<FileTrigger
							key={fileTriggerKey}
							acceptedFileTypes={['.csv']}
							onSelect={(files) => {
								const next = files ? Array.from(files)[0] ?? null : null;
								setImportFile(next);
							}}
						>
							<Button type="button" size="sm">
								{importFile ? 'Choose different file' : 'Choose file'}
							</Button>
						</FileTrigger>
						<p className="field-help">{importFile ? importFile.name : 'No file selected'}</p>
					</div>
					<Checkbox
						isSelected={skipDuplicates}
						onChange={setSkipDuplicates}
					>
						Skip duplicate shows (same date + time)
					</Checkbox>
					<Button
						variant="primary"
						type="submit"
						isDisabled={!importFile || importLoading}
					>
						{importLoading ? 'Importing...' : 'Import'}
					</Button>
				</form>

				{importError && (
					<div className="alert alert--error" style={{ marginTop: '1rem' }}>
						{importError}
					</div>
				)}
				{importResult && (
					<div className="alert alert--success" style={{ marginTop: '1rem' }}>
						<p style={{ margin: 0 }}>
							Created: <strong>{importResult.createdCount}</strong> | Skipped:{' '}
							<strong>{importResult.skippedCount}</strong>
						</p>
						{importResult.createdShows && importResult.createdShows.length > 0 && (
							<details style={{ marginTop: '0.75rem' }}>
								<summary>Created shows</summary>
								<ul style={{ marginTop: '0.5rem' }}>
									{importResult.createdShows.map((s, i) => (
										<li key={i}>
											{s.date} — {formatShowTime(s.showTime)}
										</li>
									))}
								</ul>
							</details>
						)}
					</div>
				)}
			</div>

			{canRenameDelete && (
				<>
					<hr />
					<h2 style={{ marginBottom: '0.5rem' }}>Company</h2>
					<div className="card card--flat stack" style={{ maxWidth: '34rem' }}>
						<form onSubmit={handleRename} className="stack">
							<TextFieldInput
								label="Company name"
								value={orgName}
								onChange={setOrgName}
								inputProps={{ placeholder: 'Company name' }}
							/>
							<Button type="submit" variant="primary" isDisabled={saving}>
								{saving ? 'Saving...' : 'Rename company'}
							</Button>
						</form>
						<Button variant="danger" onPress={handleDelete}>
							Delete company
						</Button>
					</div>
				</>
			)}

			<hr />
			<h2 style={{ marginBottom: '0.5rem' }}>Team</h2>
			<p className="muted" style={{ marginBottom: '1rem' }}>
				Add members by email. They must already have an account.
			</p>
			<div className="card card--flat stack" style={{ maxWidth: '34rem', marginBottom: '1rem' }}>
				<form onSubmit={handleAddMember} className="stack">
					<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
						<TextFieldInput
							label="Email"
							value={addEmail}
							onChange={setAddEmail}
							inputProps={{ type: 'email', placeholder: 'user@example.com' }}
						/>
						{canRenameDelete && (
							<SelectField
								label="Role"
								selectedKey={addRole}
								onSelectionChange={(k) => setAddRole(k as 'owner' | 'admin' | 'actor')}
								options={[
									{ id: 'owner', label: 'Owner' },
									{ id: 'admin', label: 'Admin' },
									{ id: 'actor', label: 'Actor' },
								]}
							/>
						)}
						<Button type="submit" variant="primary" isDisabled={addMemberLoading || !addEmail.trim()}>
							{addMemberLoading ? 'Adding...' : 'Add member'}
						</Button>
					</div>
				</form>
			</div>
			<div className="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Role</th>
							<th className="no-print"></th>
						</tr>
					</thead>
					<tbody>
						{members.map((m) => (
							<tr key={m.id}>
								<td>{m.lastName}, {m.firstName}</td>
								<td>{m.email}</td>
								<td style={{ textTransform: 'capitalize' }}>{m.role}</td>
								<td className="no-print">
									{(canRenameDelete || (membership?.role === 'admin' && m.role === 'actor')) && m.id !== user?.id && (
										<Button size="sm" variant="danger" onPress={() => void handleRemoveMember(m.id)}>
											Remove
										</Button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

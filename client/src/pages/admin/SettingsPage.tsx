import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileTrigger } from 'react-aria-components';
import { api } from '../../lib/api';
import { useAuth, getMembership } from '../../lib/auth';
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
	const { user, refresh } = useAuth();
	const membership = orgSlug ? getMembership(user, orgSlug) : undefined;
	const [showTitle, setShowTitle] = useState('');
	const [weekStartsOn, setWeekStartsOn] = useState<number>(0);
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

			const res = await fetch(`/api/companies/${orgSlug}/shows/import`, {
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

	async function handleAddMember(e: React.FormEvent) {
		e.preventDefault();
		if (!orgSlug || !addEmail.trim()) return;
		setAddMemberLoading(true);
		setMessage(null);
		try {
			const role = isOwnerMember ? addRole : 'actor';
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

	const displayOrgName = membership?.company?.name || 'Company';
	const isOwnerMember = membership?.role === 'owner';

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Show Settings</h1>
					<p className="page-subtitle">{displayOrgName}</p>
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
			<div className="surface section-narrow">
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

					<div className="field field--narrow">
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

			<h2 className="section-title">Import Performance Calendar</h2>
			<p className="muted section-lead">
				Upload a CSV (<code>.csv</code>) with headers. Required columns: <code>date</code> (YYYY-MM-DD)
				and <code>showTime</code> (or <code>time</code>). Time accepts 24h <code>HH:mm</code> (or{' '}
				<code>HH:mm:ss</code>) or 12h with AM/PM (e.g. <code>2:00 PM</code>). Also accepts{' '}
				<code>matinee</code>, <code>evening</code>, <code>noon</code>, <code>midnight</code>.
			</p>
			<div className="surface section-narrow">
				<form onSubmit={handleImportSubmit} className="stack">
					<div className="stack stack--tight">
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

				{importError && <div className="alert alert--error u-mt-md">{importError}</div>}
				{importResult && (
					<div className="alert alert--success u-mt-md">
						<p className="u-m0">
							Created: <strong>{importResult.createdCount}</strong> | Skipped:{' '}
							<strong>{importResult.skippedCount}</strong>
						</p>
						{importResult.createdShows && importResult.createdShows.length > 0 && (
							<details className="u-mt-sm">
								<summary>Created shows</summary>
								<ul>
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

		<hr />
			<h2 className="section-title">Team</h2>
			<p className="muted section-lead">
				Add members by email. They must already have an account.
			</p>
			<div className="surface stack section-narrow u-mb-md">
				<form onSubmit={handleAddMember} className="stack">
					<div className="inline-form-row">
						<TextFieldInput
							label="Email"
							value={addEmail}
							onChange={setAddEmail}
							inputProps={{ type: 'email', placeholder: 'user@example.com' }}
						/>
					{isOwnerMember && (
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
								<td className="role-capitalize">{m.role}</td>
								<td className="no-print">
									{(isOwnerMember || (membership?.role === 'admin' && m.role === 'actor')) && m.id !== user?.id && (
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

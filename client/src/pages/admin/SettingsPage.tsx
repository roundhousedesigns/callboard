import { useState, useEffect } from 'react';
import { FileTrigger } from 'react-aria-components';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatShowTime } from '../../lib/dateUtils';
import { Button, Checkbox, SelectField, TextFieldInput } from '../../components/ui';
import { BulkShowCreator } from '../../components/BulkShowCreator';

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
	const { user, refresh } = useAuth();
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

	useEffect(() => {
		async function load() {
			try {
				const settings = await api.get<OrgSettings>('/organizations/me/settings');
				setShowTitle(settings.showTitle ?? '');
				setWeekStartsOn(settings.weekStartsOn ?? 0);
			} catch (err) {
				setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load' });
			} finally {
				setLoading(false);
			}
		}
		void load();
	}, []);

	async function submitSettings() {
		setMessage(null);
		setSaving(true);
		try {
			await api.patch('/organizations/me/settings', {
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
		if (!importFile) return;
		setImportError(null);
		setImportResult(null);
		setImportLoading(true);
		try {
			const formData = new FormData();
			formData.append('file', importFile);
			formData.append('skipDuplicates', String(skipDuplicates));

			const res = await fetch('/api/shows/import', {
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

	if (loading) return <div className="muted">Loading...</div>;

	const orgName = user?.organization?.name ?? 'Organization';

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Settings</h1>
					<p className="page-subtitle">Organization: {orgName}</p>
				</div>
				<div className="no-print">
					<BulkShowCreator triggerLabel="Build schedule" />
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
								placeholder: orgName,
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
		</div>
	);
}

import { useState, useEffect, useRef } from 'react';
import {
	Button,
	Callout,
	Card,
	Checkbox,
	Classes,
	FormGroup,
	H3,
	HTMLSelect,
	InputGroup,
	Spinner,
} from '@blueprintjs/core';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatShowTime } from '../../lib/dateUtils';

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
	const importInputRef = useRef<HTMLInputElement>(null);

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
			if (importInputRef.current) importInputRef.current.value = '';
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

	if (loading) {
		return (
			<div className="page-centered">
				<Spinner size={28} />
			</div>
		);
	}

	const orgName = user?.organization?.name ?? 'Organization';

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Settings</h1>
					<p className="page-subtitle">Organization: {orgName}</p>
				</div>
			</div>
			<Card className="form-card">
				<form onSubmit={handleSubmit} className="form-stack">
					<FormGroup
						label="Show title"
						labelFor="showTitle"
						helperText="Displayed in header, reports, and printouts. Falls back to org name if empty."
					>
						<InputGroup
							id="showTitle"
							type="text"
							value={showTitle}
							onChange={(e) => setShowTitle(e.target.value)}
							placeholder={orgName}
						/>
					</FormGroup>
					<FormGroup
						label="Week starts on"
						labelFor="weekStartsOn"
						helperText="Callboard weekly view shows shows starting from this day."
					>
						<HTMLSelect
							id="weekStartsOn"
							value={weekStartsOn}
							onChange={(e) => setWeekStartsOn(Number(e.target.value))}
						>
							{WEEKDAY_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</HTMLSelect>
					</FormGroup>
					{message && (
						<Callout intent={message.type === 'error' ? 'danger' : 'success'}>
							{message.text}
						</Callout>
					)}
					<Button intent="primary" type="submit" loading={saving} text={saving ? 'Saving...' : 'Save settings'} />
				</form>
			</Card>

			<H3>Import Performance Calendar</H3>
			<p className="page-subtitle">
				Upload a CSV or Excel file with columns <code>date</code> (YYYY-MM-DD) and{' '}
				<code>showTime</code>, or <code>time</code>. Accepts 24h (14:00), 12h (2:00 PM).
			</p>
			<Card className="form-card">
				<form onSubmit={handleImportSubmit} className="form-stack">
					<FormGroup label="Calendar file">
						<input
							className={Classes.INPUT}
							ref={importInputRef}
							type="file"
							accept=".csv,.xlsx,.xls"
							onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
						/>
					</FormGroup>
					<Checkbox
						checked={skipDuplicates}
						onChange={(e) => setSkipDuplicates((e.target as HTMLInputElement).checked)}
						label="Skip duplicate shows (same date + time)"
					/>
					<Button
						intent="primary"
						type="submit"
						loading={importLoading}
						disabled={!importFile || importLoading}
						text={importLoading ? 'Importing...' : 'Import'}
					/>
				</form>
				{importError && <Callout intent="danger">{importError}</Callout>}
				{importResult && (
					<Callout intent="success">
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
					</Callout>
				)}
			</Card>
		</div>
	);
}

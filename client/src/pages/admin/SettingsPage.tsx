import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatShowTime } from '../../lib/dateUtils';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Mon–Sun
const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6];

interface ImportResult {
	createdCount: number;
	skippedCount: number;
	createdShows?: Array<{ date: string; showTime: string }>;
	skippedShows?: Array<{ date: string; showTime: string }>;
}

interface OrgSettings {
	showTitle: string | null;
	showsPerWeek: number | null;
	darkDays: number[];
}

export function SettingsPage() {
	const { user, refresh } = useAuth();
	const [showTitle, setShowTitle] = useState('');
	const [showsPerWeek, setShowsPerWeek] = useState<number | ''>(1);
	const [darkDays, setDarkDays] = useState<number[]>([]);
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
				setShowsPerWeek(settings.showsPerWeek ?? 1);
				setDarkDays(settings.darkDays ?? []);
			} catch (err) {
				setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load' });
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	function toggleDarkDay(day: number) {
		setDarkDays((prev) =>
			prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
		);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setMessage(null);
		setSaving(true);
		try {
			await api.patch('/organizations/me/settings', {
				showTitle: showTitle.trim() || null,
				showsPerWeek: showsPerWeek === '' ? null : Number(showsPerWeek),
				darkDays,
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

	async function handleImportSubmit(e: React.FormEvent) {
		e.preventDefault();
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

	if (loading) return <div className="muted">Loading...</div>;

	const orgName = user?.organization?.name ?? 'Organization';

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Settings</h1>
					<p className="page-subtitle">Organization: {orgName}</p>
				</div>
			</div>
			<div className="card card--flat" style={{ maxWidth: '34rem' }}>
				<form onSubmit={handleSubmit} className="stack">
					<label className="field" htmlFor="showTitle">
						<span className="field-label">Show title</span>
						<input
							id="showTitle"
							type="text"
							value={showTitle}
							onChange={(e) => setShowTitle(e.target.value)}
							placeholder={orgName}
							style={{ width: '100%' }}
						/>
						<p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>
							Displayed in header, reports, and printouts. Falls back to org name if empty.
						</p>
					</label>

					<label className="field" htmlFor="showsPerWeek">
						<span className="field-label">Number of shows per week</span>
						<input
							id="showsPerWeek"
							type="number"
							min={1}
							value={showsPerWeek}
							onChange={(e) => {
								const v = e.target.value;
								setShowsPerWeek(v === '' ? '' : Math.max(1, parseInt(v, 10) || 1));
							}}
							style={{ width: '7rem' }}
						/>
					</label>

					<div className="field">
						<span className="field-label">Dark days (days off)</span>
						<p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>
							Select days with no performances.
						</p>
						<div className="day-toggle-grid">
							{DAY_INDICES.map((day, i) => (
								<button
									key={day}
									type="button"
									onClick={() => toggleDarkDay(day)}
									aria-pressed={darkDays.includes(day)}
									aria-label={`${DAY_LABELS[i]} ${darkDays.includes(day) ? 'selected' : 'not selected'}`}
									className="day-toggle"
								>
									{DAY_LABELS[i]}
								</button>
							))}
						</div>
					</div>

					{message && (
						<div className={`alert ${message.type === 'error' ? 'alert--error' : 'alert--success'}`}>
							{message.text}
						</div>
					)}

					<button className="btn btn--primary" type="submit" disabled={saving}>
						{saving ? 'Saving...' : 'Save settings'}
					</button>
				</form>
			</div>

			<hr />

			<h2 style={{ marginBottom: '0.5rem' }}>Import Performance Calendar</h2>
			<p className="muted" style={{ marginBottom: '1rem' }}>
				Upload a CSV or Excel file with columns <code>date</code> (YYYY-MM-DD) and{' '}
				<code>showTime</code>, or <code>time</code>. Accepts 24h (14:00), 12h (2:00 PM).
			</p>
			<div className="card card--flat" style={{ maxWidth: '34rem' }}>
				<form onSubmit={handleImportSubmit} className="stack">
					<input
						ref={importInputRef}
						type="file"
						accept=".csv,.xlsx,.xls"
						onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
					/>
					<label className="checkbox-row">
						<input
							type="checkbox"
							checked={skipDuplicates}
							onChange={(e) => setSkipDuplicates(e.target.checked)}
						/>
						Skip duplicate shows (same date + time)
					</label>
					<button className="btn btn--primary" type="submit" disabled={!importFile || importLoading}>
						{importLoading ? 'Importing...' : 'Import'}
					</button>
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

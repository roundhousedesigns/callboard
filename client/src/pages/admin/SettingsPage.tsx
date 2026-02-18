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

	if (loading) return <div>Loading...</div>;

	const orgName = user?.organization?.name ?? 'Organization';

	return (
		<div>
			<h1>Settings</h1>
			<p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
				Organization: {orgName}
			</p>
			<form onSubmit={handleSubmit} style={{ maxWidth: '28rem' }}>
				<div style={{ marginBottom: '1.5rem' }}>
					<label
						htmlFor="showTitle"
						style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
					>
						Show title
					</label>
					<input
						id="showTitle"
						type="text"
						value={showTitle}
						onChange={(e) => setShowTitle(e.target.value)}
						placeholder={orgName}
						style={{ width: '100%' }}
					/>
					<p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
						Displayed in header, reports, and printouts. Falls back to org name if empty.
					</p>
				</div>

				<div style={{ marginBottom: '1.5rem' }}>
					<label
						htmlFor="showsPerWeek"
						style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
					>
						Number of shows per week
					</label>
					<input
						id="showsPerWeek"
						type="number"
						min={1}
						value={showsPerWeek}
						onChange={(e) => {
							const v = e.target.value;
							setShowsPerWeek(v === '' ? '' : Math.max(1, parseInt(v, 10) || 1));
						}}
						style={{ width: '6rem' }}
					/>
				</div>

				<div style={{ marginBottom: '1.5rem' }}>
					<span
						style={{
							display: 'block',
							marginBottom: '0.5rem',
							fontWeight: 500,
						}}
					>
						Dark days (days off)
					</span>
					<p
						style={{
							fontSize: '0.85rem',
							color: 'var(--text-muted)',
							marginBottom: '0.5rem',
						}}
					>
						Select days with no performances.
					</p>
					<div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
						{DAY_INDICES.map((day, i) => (
							<button
								key={day}
								type="button"
								onClick={() => toggleDarkDay(day)}
								aria-pressed={darkDays.includes(day)}
								aria-label={`${DAY_LABELS[i]} ${darkDays.includes(day) ? 'selected' : 'not selected'}`}
								style={{
									width: '2.5rem',
									height: '2.5rem',
									padding: 0,
									fontWeight: 600,
									borderRadius: '6px',
									border: '1px solid var(--border)',
									background: darkDays.includes(day) ? 'var(--accent)' : 'var(--bg-elevated)',
									color: darkDays.includes(day) ? 'var(--bg)' : 'var(--text)',
									cursor: 'pointer',
								}}
							>
								{DAY_LABELS[i]}
							</button>
						))}
					</div>
				</div>

				{message && (
					<div
						style={{
							marginBottom: '1rem',
							color: message.type === 'error' ? 'var(--error)' : 'var(--success)',
						}}
					>
						{message.text}
					</div>
				)}

				<button type="submit" disabled={saving}>
					{saving ? 'Saving...' : 'Save settings'}
				</button>
			</form>

			<hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />

			<h2 style={{ marginBottom: '0.5rem' }}>Import Performance Calendar</h2>
			<p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
				Upload a CSV or Excel file with columns <code>date</code> (YYYY-MM-DD) and{' '}
				<code>showTime</code>, or <code>time</code>. Accepts 24h (14:00), 12h (2:00 PM).
			</p>
			<form onSubmit={handleImportSubmit} style={{ maxWidth: '28rem', marginBottom: '1.5rem' }}>
				<div style={{ marginBottom: '1rem' }}>
					<input
						ref={importInputRef}
						type="file"
						accept=".csv,.xlsx,.xls"
						onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
					/>
				</div>
				<label
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.5rem',
						marginBottom: '1rem',
					}}
				>
					<input
						type="checkbox"
						checked={skipDuplicates}
						onChange={(e) => setSkipDuplicates(e.target.checked)}
					/>
					Skip duplicate shows (same date + time)
				</label>
				<button type="submit" disabled={!importFile || importLoading}>
					{importLoading ? 'Importing...' : 'Import'}
				</button>
			</form>
			{importError && (
				<div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{importError}</div>
			)}
			{importResult && (
				<div
					style={{
						padding: '1rem',
						background: 'var(--bg-elevated)',
						borderRadius: '6px',
						maxWidth: '28rem',
					}}
				>
					<p>
						Created: <strong>{importResult.createdCount}</strong> | Skipped:{' '}
						<strong>{importResult.skippedCount}</strong>
					</p>
					{importResult.createdShows && importResult.createdShows.length > 0 && (
						<details>
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
	);
}

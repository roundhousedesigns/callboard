import { useState } from 'react';
import { Dialog, DialogTrigger, Modal, ModalOverlay } from 'react-aria-components';
import { api } from '../lib/api';
import { formatShowTime } from '../lib/dateUtils';
import { Button, TextFieldInput } from './ui';
import type { ButtonProps } from './ui/Button';

interface BulkShowResult {
	createdCount: number;
	skippedCount: number;
	createdShows: Array<{ date: string; showTime: string }>;
	skippedShows: Array<{ date: string; showTime: string }>;
}

interface BulkShowCreatorProps {
	onCreated?: () => void | Promise<void>;
	triggerLabel?: string;
	triggerVariant?: ButtonProps['variant'];
	triggerSize?: ButtonProps['size'];
}

const WEEKDAYS: Array<{ key: string; label: string }> = [
	{ key: '0', label: 'Sunday' },
	{ key: '1', label: 'Monday' },
	{ key: '2', label: 'Tuesday' },
	{ key: '3', label: 'Wednesday' },
	{ key: '4', label: 'Thursday' },
	{ key: '5', label: 'Friday' },
	{ key: '6', label: 'Saturday' },
];

function createEmptyWeekdayTimes(): Record<string, string[]> {
	return WEEKDAYS.reduce<Record<string, string[]>>((acc, weekday) => {
		acc[weekday.key] = [];
		return acc;
	}, {});
}

export function BulkShowCreator({
	onCreated,
	triggerLabel = 'Bulk create shows',
	triggerVariant = 'default',
	triggerSize = 'sm',
}: BulkShowCreatorProps) {
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [weekdayTimes, setWeekdayTimes] = useState<Record<string, string[]>>(
		createEmptyWeekdayTimes(),
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<BulkShowResult | null>(null);

	function addTime(weekdayKey: string) {
		setWeekdayTimes((prev) => ({
			...prev,
			[weekdayKey]: [...(prev[weekdayKey] ?? []), ''],
		}));
	}

	function removeTime(weekdayKey: string, index: number) {
		setWeekdayTimes((prev) => ({
			...prev,
			[weekdayKey]: (prev[weekdayKey] ?? []).filter((_, i) => i !== index),
		}));
	}

	function updateTime(weekdayKey: string, index: number, value: string) {
		setWeekdayTimes((prev) => ({
			...prev,
			[weekdayKey]: (prev[weekdayKey] ?? []).map((time, i) => (i === index ? value : time)),
		}));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setResult(null);
		setIsSubmitting(true);
		try {
			const payloadWeekdayTimes = Object.fromEntries(
				Object.entries(weekdayTimes).map(([weekday, times]) => [
					weekday,
					times.map((time) => time.trim()).filter((time) => time.length > 0),
				]),
			);

			const response = await api.post<BulkShowResult>('/shows/bulk-generate', {
				startDate,
				endDate,
				weekdayTimes: payloadWeekdayTimes,
				skipDuplicates: true,
			});
			setResult(response);
			if (onCreated) await onCreated();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create shows');
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<DialogTrigger>
			<Button type="button" variant={triggerVariant} size={triggerSize}>
				{triggerLabel}
			</Button>
			<ModalOverlay
				isDismissable
				style={{
					position: 'fixed',
					inset: 0,
					background: 'rgba(0, 0, 0, 0.65)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: '1rem',
					zIndex: 100,
				}}
			>
				<Modal
					style={{
						width: 'min(900px, 100%)',
						maxHeight: '92vh',
						overflow: 'auto',
						borderRadius: 'var(--radius-md)',
						border: '1px solid var(--border)',
						background: 'var(--bg-elevated)',
						boxShadow: 'var(--shadow-md)',
					}}
				>
					<Dialog>
						{({ close }) => (
							<div style={{ padding: '1rem' }}>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										gap: '0.75rem',
										marginBottom: '0.75rem',
									}}
								>
									<div>
										<h2 style={{ marginBottom: '0.35rem' }}>Bulk Show Creator</h2>
										<p className="muted" style={{ margin: 0 }}>
											Generate a schedule by date range and weekday times.
										</p>
									</div>
									<Button type="button" variant="ghost" size="sm" onPress={close}>
										Close
									</Button>
								</div>
								<form onSubmit={handleSubmit} className="stack">
									<div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
										<TextFieldInput
											label="Start date"
											value={startDate}
											onChange={setStartDate}
											isRequired
											inputProps={{ type: 'date' }}
										/>
										<TextFieldInput
											label="End date"
											value={endDate}
											onChange={setEndDate}
											isRequired
											inputProps={{ type: 'date' }}
										/>
									</div>

									<div className="stack">
										{WEEKDAYS.map((weekday) => {
											const times = weekdayTimes[weekday.key] ?? [];
											return (
												<div key={weekday.key} className="field">
													<div
														style={{
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'flex-start',
															gap: '0.75rem',
															flexWrap: 'nowrap',
														}}
													>
														<strong>{weekday.label}</strong>
														<Button
															type="button"
															size="sm"
															onPress={() => {
																addTime(weekday.key);
															}}
														>
															Add showtime
														</Button>
													</div>
													{times.length === 0 ? (
														<p className="muted" style={{ marginTop: '0.35rem' }}>
															No shows
														</p>
													) : (
														<div className="stack" style={{ marginTop: '0.5rem', gap: '0.5rem' }}>
															{times.map((time, index) => (
																<div
																	key={`${weekday.key}-${index}`}
																	style={{
																		display: 'flex',
																		alignItems: 'flex-end',
																		gap: '0.5rem',
																		flexWrap: 'wrap',
																	}}
																>
																	<div style={{ width: '12rem' }}>
																		<TextFieldInput
																			label={`Time ${index + 1}`}
																			value={time}
																			onChange={(value) => {
																				updateTime(weekday.key, index, value);
																			}}
																			inputProps={{ type: 'time' }}
																		/>
																	</div>
																	<Button
																		type="button"
																		size="sm"
																		variant="danger"
																		onPress={() => {
																			removeTime(weekday.key, index);
																		}}
																	>
																		Remove
																	</Button>
																</div>
															))}
														</div>
													)}
												</div>
											);
										})}
									</div>

									<Button variant="primary" type="submit" isDisabled={isSubmitting}>
										{isSubmitting ? 'Creating...' : 'Create schedule'}
									</Button>
								</form>

								{error && (
									<div className="alert alert--error" style={{ marginTop: '1rem' }}>
										{error}
									</div>
								)}
								{result && (
									<div className="alert alert--success" style={{ marginTop: '1rem' }}>
										<p style={{ margin: 0 }}>
											Created: <strong>{result.createdCount}</strong> | Skipped:{' '}
											<strong>{result.skippedCount}</strong>
										</p>
										{result.createdShows.length > 0 && (
											<details style={{ marginTop: '0.75rem' }}>
												<summary>Created shows</summary>
												<ul style={{ marginTop: '0.5rem' }}>
													{result.createdShows.map((show, index) => (
														<li key={`created-${index}`}>
															{show.date} — {formatShowTime(show.showTime)}
														</li>
													))}
												</ul>
											</details>
										)}
										{result.skippedShows.length > 0 && (
											<details style={{ marginTop: '0.75rem' }}>
												<summary>Skipped duplicates</summary>
												<ul style={{ marginTop: '0.5rem' }}>
													{result.skippedShows.map((show, index) => (
														<li key={`skipped-${index}`}>
															{show.date} — {formatShowTime(show.showTime)}
														</li>
													))}
												</ul>
											</details>
										)}
									</div>
								)}
							</div>
						)}
					</Dialog>
				</Modal>
			</ModalOverlay>
		</DialogTrigger>
	);
}

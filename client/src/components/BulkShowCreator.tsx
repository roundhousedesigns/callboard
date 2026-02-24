import { useEffect, useRef, useState } from 'react';
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

function getTimeSlot(times: string[] | undefined, index: number): string {
	return times?.[index] ?? '';
}

function setTimeSlot(times: string[] | undefined, index: number, value: string): string[] {
	const next = [...(times ?? [])];
	while (next.length <= index) next.push('');
	next[index] = value;
	return next;
}

function removeTimeSlot(times: string[] | undefined, index: number): string[] {
	return (times ?? []).filter((_, i) => i !== index);
}

function getTimeInputId(weekdayKey: string, index: number): string {
	return `bulk-show-creator-${weekdayKey}-time-${index}`;
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

	const focusTargetRef = useRef<{ weekdayKey: string; index: number } | null>(null);

	useEffect(() => {
		const target = focusTargetRef.current;
		if (!target) return;
		const el = document.getElementById(getTimeInputId(target.weekdayKey, target.index));
		if (el instanceof HTMLInputElement) el.focus();
		focusTargetRef.current = null;
	}, [weekdayTimes]);

	function addExtraTime(weekdayKey: string) {
		setWeekdayTimes((prev) => {
			const current = prev[weekdayKey] ?? [];
			const nextIndex = Math.max(2, current.length);
			const nextTimes = [...current];
			while (nextTimes.length <= nextIndex) nextTimes.push('');

			focusTargetRef.current = { weekdayKey, index: nextIndex };
			return { ...prev, [weekdayKey]: nextTimes };
		});
	}

	function clearAllTimes() {
		setWeekdayTimes(createEmptyWeekdayTimes());
	}

	function removeTime(weekdayKey: string, index: number) {
		setWeekdayTimes((prev) => ({
			...prev,
			[weekdayKey]: removeTimeSlot(prev[weekdayKey], index),
		}));
	}

	function updateTime(weekdayKey: string, index: number, value: string) {
		setWeekdayTimes((prev) => ({
			...prev,
			[weekdayKey]: setTimeSlot(prev[weekdayKey], index, value),
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
										<div
											style={{
												display: 'flex',
												alignItems: 'baseline',
												justifyContent: 'space-between',
												gap: '0.75rem',
												flexWrap: 'wrap',
											}}
										>
											<div>
												<strong>Showtimes</strong>
												<p className="muted" style={{ margin: '0.25rem 0 0 0' }}>
													Enter up to two times per weekday. Add more if needed.
												</p>
											</div>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onPress={clearAllTimes}
											>
												Clear all times
											</Button>
										</div>
										{WEEKDAYS.map((weekday) => {
											const times = weekdayTimes[weekday.key] ?? [];
											const extraTimes = times.slice(2);
											const lastVisibleIndex = Math.max(1, times.length - 1);

											function handleTimeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
												if (e.key !== 'Enter') return;
												if (index !== lastVisibleIndex) return;
												e.preventDefault();
												addExtraTime(weekday.key);
											}

											return (
												<div key={weekday.key} className="field">
													<div
														style={{
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'space-between',
															gap: '0.75rem',
															flexWrap: 'wrap',
														}}
													>
														<strong>{weekday.label}</strong>
														<Button type="button" size="sm" onPress={() => addExtraTime(weekday.key)}>
															+ Add time
														</Button>
													</div>
													<div
														style={{
															display: 'flex',
															alignItems: 'flex-end',
															gap: '0.5rem',
															flexWrap: 'wrap',
															marginTop: '0.5rem',
														}}
													>
														<div style={{ width: '12rem' }}>
															<TextFieldInput
																label="Time 1"
																aria-label={`${weekday.label} — Time 1`}
																value={getTimeSlot(times, 0)}
																onChange={(value) => updateTime(weekday.key, 0, value)}
																inputProps={{
																	type: 'time',
																	id: getTimeInputId(weekday.key, 0),
																	onKeyDown: (e) => handleTimeKeyDown(0, e),
																}}
															/>
														</div>
														<div style={{ width: '12rem' }}>
															<TextFieldInput
																label="Time 2"
																aria-label={`${weekday.label} — Time 2`}
																value={getTimeSlot(times, 1)}
																onChange={(value) => updateTime(weekday.key, 1, value)}
																inputProps={{
																	type: 'time',
																	id: getTimeInputId(weekday.key, 1),
																	onKeyDown: (e) => handleTimeKeyDown(1, e),
																}}
															/>
														</div>
													</div>

													{extraTimes.length > 0 ? (
														<div className="stack" style={{ marginTop: '0.5rem', gap: '0.5rem' }}>
															{extraTimes.map((time, offset) => {
																const index = offset + 2;
																return (
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
																				aria-label={`${weekday.label} — Time ${index + 1}`}
																				value={time}
																				onChange={(value) => updateTime(weekday.key, index, value)}
																				inputProps={{
																					type: 'time',
																					id: getTimeInputId(weekday.key, index),
																					onKeyDown: (e) => handleTimeKeyDown(index, e),
																				}}
																			/>
																		</div>
																		<Button
																			type="button"
																			size="sm"
																			variant="danger"
																			onPress={() => removeTime(weekday.key, index)}
																		>
																			Remove
																		</Button>
																	</div>
																);
															})}
														</div>
													) : null}
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

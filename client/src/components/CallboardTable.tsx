import { Link } from 'react-router-dom';
import {
	Button,
	Menu,
	MenuItem,
	MenuTrigger,
	Popover,
} from 'react-aria-components';
import { formatShowTime } from '../lib/dateUtils';
import { StatusIcon, statusLabels } from './StatusIcon';

export interface Actor {
	id: string;
	firstName: string;
	lastName: string;
}

export interface Show {
	id: string;
	date: string;
	showTime: string;
	activeAt: string | null;
	lockedAt: string | null;
	signInToken?: string | null;
}

export interface AttendanceRecord {
	userId: string;
	showId: string;
	status: 'signed_in' | 'absent' | 'vacation' | 'personal_day';
}

interface CallboardTableProps {
	actors: Actor[];
	shows: Show[];
	attendance: AttendanceRecord[];
	onSetStatus?: (userId: string, showId: string, status: AttendanceRecord['status'] | null) => void;
	readOnly?: boolean;
	/** When true, visually highlights the next upcoming show column */
	highlightNextUpcoming?: boolean;
}

const statusColors: Record<AttendanceRecord['status'], string> = {
	signed_in: 'var(--success)',
	absent: 'var(--error)',
	vacation: 'var(--accent)',
	personal_day: 'var(--warning)',
};

const STATUS_OPTIONS: Array<{ value: AttendanceRecord['status'] }> = [
	{ value: 'signed_in' },
	{ value: 'absent' },
	{ value: 'vacation' },
	{ value: 'personal_day' },
];

function StatusSelect({
	value,
	onChange,
}: {
	value: AttendanceRecord['status'] | null;
	onChange: (status: AttendanceRecord['status'] | null) => void;
}) {
	return (
		<MenuTrigger>
			<Button
				type="button"
				className="status-select__trigger"
				aria-label={value ? `Status: ${statusLabels[value]}` : 'Set status'}
			>
				{value ? (
					<StatusIcon status={value} color={statusColors[value]} />
				) : (
					<span
						aria-hidden
						style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}
					>
						—
					</span>
				)}
			</Button>
			<Popover
				offset={6}
				className="status-select__popover"
			>
				<Menu
					aria-label="Attendance status"
					className="status-select__menu"
					onAction={(key) => {
						if (key === 'clear') {
							onChange(null);
							return;
						}
						if (typeof key === 'string' && key in statusLabels) {
							onChange(key as AttendanceRecord['status']);
						}
					}}
					selectedKeys={value ? [value] : []}
					selectionMode="single"
				>
					{value !== null && (
						<MenuItem
							id="clear"
							className="status-select__item status-select__item--clear"
						>
							Clear
						</MenuItem>
					)}
					{STATUS_OPTIONS.map((opt) => (
						<MenuItem
							key={opt.value}
							id={opt.value}
							aria-label={statusLabels[opt.value]}
							className="status-select__item"
						>
							<StatusIcon status={opt.value} color={statusColors[opt.value]} />
						</MenuItem>
					))}
				</Menu>
			</Popover>
		</MenuTrigger>
	);
}

function QRCodeIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
			style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '4px' }}
		>
			<rect x="3" y="3" width="7" height="7" rx="1" />
			<rect x="14" y="3" width="7" height="7" rx="1" />
			<rect x="3" y="14" width="7" height="7" rx="1" />
			<rect x="14" y="14" width="3" height="3" rx="0.5" />
			<rect x="19" y="14" width="2" height="2" rx="0.5" />
			<rect x="14" y="19" width="2" height="2" rx="0.5" />
		</svg>
	);
}

function getLocalDateFromDateOnlyString(dateStr: string): Date {
	const yyyyMmDd = dateStr.slice(0, 10);
	const [y, m, d] = yyyyMmDd.split('-').map(Number);
	return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function getShowDateTime(show: Show): number {
	const [h, m] = show.showTime.split(':').map(Number);
	const d = getLocalDateFromDateOnlyString(show.date);
	d.setHours(h, m, 0, 0);
	return d.getTime();
}

export function CallboardTable({
	actors,
	shows,
	attendance,
	onSetStatus,
	readOnly = false,
	highlightNextUpcoming = false,
}: CallboardTableProps) {
	const getStatus = (userId: string, showId: string) =>
		attendance.find((a) => a.userId === userId && a.showId === showId)?.status;

	const nextUpcomingShowId =
		highlightNextUpcoming && shows.length > 0
			? (() => {
					const now = Date.now();
					const next = shows.find((s) => getShowDateTime(s) > now);
					return next?.id ?? null;
				})()
			: null;

	const isHighlighted = (showId: string) => showId === nextUpcomingShowId;
	const highlightStyle: React.CSSProperties = {
		background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
		borderLeft: '3px solid var(--accent)',
		borderRight: '3px solid var(--accent)',
	};
	const thHighlightStyle = highlightStyle;

	return (
		<div className="table-wrap">
			<table>
				<thead>
					<tr>
						<th style={{ minWidth: '140px' }}>Actor</th>
						{shows.map((s) => {
							const d = getLocalDateFromDateOnlyString(s.date);
							const dayLabel = d.toLocaleDateString(undefined, { weekday: 'long' });
							const dateLabel = d.toLocaleDateString(undefined, {
								month: 'numeric',
								day: 'numeric',
							});
							const timeLabel = formatShowTime(s.showTime).toLowerCase().replace(' ', '');
							const isActiveShow = !!s.activeAt;
							return (
								<th
									key={s.id}
									style={{
										minWidth: '100px',
										...(isHighlighted(s.id) ? thHighlightStyle : {}),
									}}
								>
									{dayLabel} {dateLabel}
									<br />
									<span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
										{timeLabel}
										{isActiveShow && !readOnly && (
											<Link
												to="/admin/qr"
												title="Open QR code"
												className="btn btn--sm btn--ghost no-print"
												style={{ padding: '0.2rem 0.35rem', marginLeft: '0.25rem' }}
											>
												<QRCodeIcon />
											</Link>
										)}
									</span>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{actors.map((actor) => (
						<tr key={actor.id}>
							<td>
								{actor.lastName}, {actor.firstName}
							</td>
							{shows.map((show) => {
								const status = getStatus(actor.id, show.id);
								return (
									<td
										key={show.id}
										style={isHighlighted(show.id) ? highlightStyle : undefined}
									>
										{readOnly ? (
											status ? (
												<span
													style={{
														color: statusColors[status],
														display: 'inline-flex',
													}}
												>
													<StatusIcon status={status} color={statusColors[status]} />
												</span>
											) : (
												<span style={{ color: 'var(--text-muted)' }}>—</span>
											)
										) : (
											<StatusSelect
												value={status ?? null}
												onChange={(v) => onSetStatus?.(actor.id, show.id, v)}
											/>
										)}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

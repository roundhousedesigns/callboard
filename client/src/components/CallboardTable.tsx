import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Button,
	Card,
	Elevation,
	HTMLTable,
	Menu,
	MenuItem,
	Popover,
	Position,
} from '@blueprintjs/core';
import { formatShowTime } from '../lib/dateUtils';
import { StatusIcon, statusIcons, statusIntents, statusLabels } from './StatusIcon';

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

const STATUS_OPTIONS: AttendanceRecord['status'][] = [
	'signed_in',
	'absent',
	'vacation',
	'personal_day',
];

function StatusSelect({
	value,
	onChange,
}: {
	value: AttendanceRecord['status'] | null;
	onChange: (status: AttendanceRecord['status'] | null) => void;
}) {
	const currentLabel = value ? statusLabels[value] : 'Unset';

	return (
		<Popover
			position={Position.BOTTOM_LEFT}
			content={
				<Menu>
					{value !== null && <MenuItem icon="minus" text="Clear status" onClick={() => onChange(null)} />}
					{STATUS_OPTIONS.map((status) => (
						<MenuItem
							key={status}
							icon={statusIcons[status]}
							intent={statusIntents[status]}
							text={statusLabels[status]}
							onClick={() => onChange(status)}
						/>
					))}
				</Menu>
			}
		>
			<Button
				minimal
				small
				icon={value ? statusIcons[value] : 'minus'}
				intent={value ? statusIntents[value] : undefined}
				aria-label={`Status: ${currentLabel}`}
				title={currentLabel}
			/>
		</Popover>
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
	const navigate = useNavigate();

	const attendanceByCell = useMemo(
		() =>
			new Map(
				attendance.map((record) => [
					`${record.userId}:${record.showId}`,
					record.status,
				]),
			),
		[attendance],
	);

	const getStatus = (userId: string, showId: string) => attendanceByCell.get(`${userId}:${showId}`);

	const nextUpcomingShowId = useMemo(() => {
		if (!highlightNextUpcoming || shows.length === 0) return null;
		const now = Date.now();
		const next = shows.find((s) => getShowDateTime(s) > now);
		return next?.id ?? null;
	}, [highlightNextUpcoming, shows]);

	const isHighlighted = (showId: string) => showId === nextUpcomingShowId;
	const highlightStyle: React.CSSProperties = {
		background: 'color-mix(in srgb, var(--app-accent) 16%, transparent)',
	};

	return (
		<Card elevation={Elevation.ONE} className="table-card">
			<HTMLTable bordered striped interactive condensed className="callboard-table">
				<thead>
					<tr>
						<th style={{ minWidth: '180px' }}>Actor</th>
						{shows.map((s) => {
							const d = getLocalDateFromDateOnlyString(s.date);
							const dayLabel = d.toLocaleDateString(undefined, { weekday: 'long' });
							const dateLabel = d.toLocaleDateString(undefined, {
								month: 'numeric',
								day: 'numeric',
							});
							const timeLabel = formatShowTime(s.showTime);
							const isActiveShow = !!s.activeAt;
							return (
								<th
									key={s.id}
									style={{
										minWidth: '100px',
										...(isHighlighted(s.id) ? highlightStyle : {}),
									}}
								>
									<div>{`${dayLabel} ${dateLabel}`}</div>
									<div className="callboard-time-label">
										{timeLabel}
										{isActiveShow && !readOnly && (
											<Button
												minimal
												small
												text="QR"
												className="no-print"
												onClick={() => navigate('/admin/qr')}
											/>
										)}
									</div>
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
										className="status-cell"
									>
										{readOnly ? (
											status ? (
												<StatusIcon status={status} />
											) : (
												<span className="status-empty">—</span>
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
			</HTMLTable>
		</Card>
	);
}

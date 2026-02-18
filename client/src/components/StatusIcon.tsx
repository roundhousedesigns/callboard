import type { AttendanceRecord } from './CallboardTable';

const statusLabels: Record<AttendanceRecord['status'], string> = {
	signed_in: 'Signed in',
	absent: 'Absent',
	vacation: 'Vacation',
	personal_day: 'Personal day',
};

const iconSize = 20;

function SignedInIcon({ color }: { color: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={iconSize}
			height={iconSize}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}

function AbsentIcon({ color }: { color: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={iconSize}
			height={iconSize}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<path d="M18 6 6 18M6 6l12 12" />
		</svg>
	);
}

function VacationIcon({ color }: { color: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={iconSize}
			height={iconSize}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<circle cx="12" cy="12" r="5" />
			<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
		</svg>
	);
}

function PersonalDayIcon({ color }: { color: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={iconSize}
			height={iconSize}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<path d="M16 2v4M8 2v4M3 10h18" />
		</svg>
	);
}

interface StatusIconProps {
	status: AttendanceRecord['status'];
	color?: string;
}

export function StatusIcon({ status, color }: StatusIconProps) {
	const c = color ?? 'currentColor';
	const label = statusLabels[status];

	const icon =
		status === 'signed_in' ? (
			<SignedInIcon color={c} />
		) : status === 'absent' ? (
			<AbsentIcon color={c} />
		) : status === 'vacation' ? (
			<VacationIcon color={c} />
		) : (
			<PersonalDayIcon color={c} />
		);

	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
		>
			{icon}
		</span>
	);
}

export { statusLabels };

import type { AttendanceRecord } from './CallboardTable';
import { Icon, type Intent } from '@blueprintjs/core';
import type { IconName } from '@blueprintjs/icons';

const statusLabels: Record<AttendanceRecord['status'], string> = {
	signed_in: 'Signed in',
	absent: 'Absent',
	vacation: 'Vacation',
	personal_day: 'Personal day',
};

const statusIcons: Record<AttendanceRecord['status'], IconName> = {
	signed_in: 'tick-circle',
	absent: 'cross-circle',
	vacation: 'airplane',
	personal_day: 'calendar',
};

const statusIntents: Record<AttendanceRecord['status'], Intent> = {
	signed_in: 'success',
	absent: 'danger',
	vacation: 'primary',
	personal_day: 'warning',
};

interface StatusIconProps {
	status: AttendanceRecord['status'];
	size?: number;
}

export function StatusIcon({ status, size = 18 }: StatusIconProps) {
	const label = statusLabels[status];

	return (
		<Icon
			role="img"
			icon={statusIcons[status]}
			intent={statusIntents[status]}
			title={label}
			size={size}
		/>
	);
}

export { statusLabels, statusIcons, statusIntents };

/** Format show time (HH:mm or HH:mm:ss) for display, e.g. "14:00" -> "2:00 PM" */
export function formatShowTime(showTime: string): string {
	const match = showTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
	if (!match) return showTime;
	const h = parseInt(match[1], 10);
	const m = match[2];
	if (h === 0) return `12:${m} AM`;
	if (h === 12) return `12:${m} PM`;
	return h < 12 ? `${h}:${m} AM` : `${h - 12}:${m} PM`;
}

/** Format show date + time for display, e.g. "Feb 16, 2025, 2:00 PM" */
export function formatShowDateTime(date: string | Date, showTime: string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const dateStr = d.toLocaleDateString();
	const timeStr = formatShowTime(showTime);
	return `${dateStr}, ${timeStr}`;
}

export function toLocalDateStr(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** Start of today at midnight (local time). */
export function getTodayStart(): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}

/** Start/end of the week containing the given date (Sunday–Saturday). */
export function getWeekBounds(d: Date): { start: Date; end: Date } {
	return getWeekBoundsWithStart(d, 0);
}

/**
 * Start/end of the week containing the given date when week starts on a given day.
 * @param d - reference date
 * @param weekStartsOn - 0=Sunday, 1=Monday, ... 6=Saturday
 */
export function getWeekBoundsWithStart(d: Date, weekStartsOn: number): { start: Date; end: Date } {
	const start = new Date(d);
	const day = start.getDay();
	const diff = (day - weekStartsOn + 7) % 7;
	start.setDate(start.getDate() - diff);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setDate(end.getDate() + 6);
	end.setHours(23, 59, 59, 999);
	return { start, end };
}

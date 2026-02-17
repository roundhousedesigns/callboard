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
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = d.toLocaleDateString();
  const timeStr = formatShowTime(showTime);
  return `${dateStr}, ${timeStr}`;
}

export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

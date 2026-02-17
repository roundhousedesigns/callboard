import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { User } from "../lib/auth";
import { formatShowTime } from "../lib/dateUtils";
import { StatusIcon, statusLabels } from "./StatusIcon";

export interface Show {
  id: string;
  date: string;
  showTime: string;
  activeAt: string | null;
  lockedAt: string | null;
  signInToken: string | null;
}

export interface AttendanceRecord {
  userId: string;
  showId: string;
  status: "signed_in" | "absent" | "vacation" | "personal_day";
}

interface CallboardTableProps {
  actors: User[];
  shows: Show[];
  attendance: AttendanceRecord[];
  onSetStatus?: (userId: string, showId: string, status: AttendanceRecord["status"]) => void;
  readOnly?: boolean;
}

const statusColors: Record<AttendanceRecord["status"], string> = {
	signed_in: "var(--success)",
	absent: "var(--error)",
	vacation: "var(--accent)",
	personal_day: "var(--warning)",
};

const STATUS_OPTIONS: Array<{ value: AttendanceRecord["status"] }> = [
	{ value: "signed_in" },
	{ value: "absent" },
	{ value: "vacation" },
	{ value: "personal_day" },
];

function StatusSelect({
	value,
	onChange,
}: {
	value: AttendanceRecord["status"] | null;
	onChange: (status: AttendanceRecord["status"]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [popoverRect, setPopoverRect] = useState<{ top: number; left: number } | null>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const popoverRef = useRef<HTMLUListElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			const target = e.target as Node;
			if (
				buttonRef.current?.contains(target) ||
				popoverRef.current?.contains(target)
			) {
				return;
			}
			setOpen(false);
		}
		function handleScroll() {
			setOpen(false);
		}
		document.addEventListener("mousedown", handleClickOutside);
		window.addEventListener("scroll", handleScroll, true);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			window.removeEventListener("scroll", handleScroll, true);
		};
	}, []);

	useEffect(() => {
		if (open && buttonRef.current) {
			const rect = buttonRef.current.getBoundingClientRect();
			const popoverHeight = 48;
			const spaceBelow = window.innerHeight - rect.bottom;
			const showAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

			setPopoverRect({
				left: rect.left,
				top: showAbove ? rect.top - popoverHeight : rect.bottom,
			});
		} else {
			setPopoverRect(null);
		}
	}, [open]);

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Escape") setOpen(false);
	}

	return (
		<div style={{ display: "inline-block" }} onKeyDown={handleKeyDown}>
			<button
				ref={buttonRef}
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={value ? `Status: ${statusLabels[value]}` : "Set status"}
				style={{
					border: "none",
					background: "transparent",
					color: value ? statusColors[value] : "var(--text-muted)",
					cursor: "pointer",
					padding: "2px",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{value ? (
					<StatusIcon status={value} color={statusColors[value]} />
				) : (
					<span aria-hidden style={{ fontSize: "0.9rem" }}>—</span>
				)}
			</button>
			{open &&
				popoverRect &&
				createPortal(
					<ul
						ref={popoverRef}
						role="listbox"
						aria-label="Attendance status"
						style={{
							position: "fixed",
							top: popoverRect.top,
							left: popoverRect.left,
							margin: 0,
							padding: "4px",
							listStyle: "none",
							background: "var(--bg-elevated)",
							border: "1px solid var(--border)",
							borderRadius: "6px",
							boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
							zIndex: 9999,
							display: "flex",
							gap: "2px",
						}}
					>
						{STATUS_OPTIONS.map((opt) => (
							<li key={opt.value} role="option" aria-selected={value === opt.value}>
								<button
									type="button"
									onClick={() => {
										onChange(opt.value);
										setOpen(false);
									}}
									aria-label={statusLabels[opt.value]}
									style={{
										border: "none",
										background: value === opt.value ? "var(--bg-hover)" : "transparent",
										color: statusColors[opt.value],
										cursor: "pointer",
										padding: "6px",
										borderRadius: "4px",
										display: "inline-flex",
									}}
								>
									<StatusIcon status={opt.value} color={statusColors[opt.value]} />
								</button>
							</li>
						))}
					</ul>,
					document.body
				)}
		</div>
	);
}

export function CallboardTable({
  actors,
  shows,
  attendance,
  onSetStatus,
  readOnly = false,
}: CallboardTableProps) {
  const getStatus = (userId: string, showId: string) =>
    attendance.find((a) => a.userId === userId && a.showId === showId)?.status;

  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            <th style={{ minWidth: "140px" }}>Actor</th>
            {shows.map((s) => (
              <th key={s.id} style={{ minWidth: "100px" }}>
                {new Date(s.date).toLocaleDateString()}
                <br />
                <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
                  {formatShowTime(s.showTime)}
                </span>
              </th>
            ))}
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
                  <td key={show.id}>
                    {readOnly ? (
                      status ? (
                        <span
                          style={{
                            color: statusColors[status],
                            display: "inline-flex",
                          }}
                        >
                          <StatusIcon status={status} color={statusColors[status]} />
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
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

import { useState, useEffect } from "react";
import { CallboardTable } from "../../components/CallboardTable";
import type { Show, AttendanceRecord } from "../../components/CallboardTable";
import type { User } from "../../lib/auth";
import { api } from "../../lib/api";
import { toLocalDateStr } from "../../lib/dateUtils";

export function CallboardPage() {
  const [actors, setActors] = useState<User[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    const today = new Date();
    setDateRange({
      start: toLocalDateStr(today),
      end: toLocalDateStr(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)),
    });
  }, []);

  const loadData = async (showLoading = true) => {
    if (!dateRange.start) return;
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const [usersRes, showsRes] = await Promise.all([
        api.get<User[]>("/users"),
        api.get<Show[]>(
          `/shows?start=${dateRange.start || "1970-01-01"}&end=${dateRange.end || "2099-12-31"}`
        ),
      ]);
      setActors(usersRes.filter((u) => u.role === "actor"));
      setShows(showsRes);

      const allAttendance: AttendanceRecord[] = [];
      for (const show of showsRes) {
        const att = await api.get<Array<{ userId: string; showId: string; status: string }>>(
          `/attendance?showId=${show.id}`
        );
        allAttendance.push(
          ...att.map((a) => ({
            userId: a.userId,
            showId: a.showId,
            status: a.status as AttendanceRecord["status"],
          }))
        );
      }
      setAttendance(allAttendance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    if (!dateRange.start) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [dateRange.start, dateRange.end]);

  async function handleSetStatus(
    userId: string,
    showId: string,
    status: AttendanceRecord["status"]
  ) {
    try {
      await api.post("/attendance", { userId, showId, status });
      setAttendance((prev) => {
        const rest = prev.filter(
          (a) => !(a.userId === userId && a.showId === showId)
        );
        return [...rest, { userId, showId, status }];
      });
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Callboard</h1>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <label>
          Start:{" "}
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((p) => ({ ...p, start: e.target.value }))
            }
          />
        </label>
        <label>
          End:{" "}
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((p) => ({ ...p, end: e.target.value }))
            }
          />
        </label>
        <button
          type="button"
          onClick={() => loadData(false)}
          disabled={refreshing || loading}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <CallboardTable
        actors={actors}
        shows={shows}
        attendance={attendance}
        onSetStatus={handleSetStatus}
      />
    </div>
  );
}

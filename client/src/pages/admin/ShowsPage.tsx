import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { formatShowTime } from "../../lib/dateUtils";

interface Show {
  id: string;
  date: string;
  showTime: string;
  activeAt: string | null;
  lockedAt: string | null;
  signInToken: string | null;
}

export function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: "", showTime: "" });

  useEffect(() => {
    api
      .get<Show[]>("/shows")
      .then(setShows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const show = await api.post<Show>("/shows", form);
      setShows((prev) =>
        [...prev, show].sort(
          (a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime() ||
            a.showTime.localeCompare(b.showTime)
        )
      );
      setForm({ date: "", showTime: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleActivate(id: string) {
    try {
      const updated = await api.post<Show>(`/shows/${id}/activate`);
      setShows((prev) =>
        prev.map((s) => (s.id === id ? updated : { ...s, activeAt: null }))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleLock(id: string) {
    try {
      const updated = await api.post<Show>(`/shows/${id}/lock`);
      setShows((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleUnlock(id: string) {
    try {
      const updated = await api.post<Show>(`/shows/${id}/unlock`);
      setShows((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this show?")) return;
    try {
      await api.delete(`/shows/${id}`);
      setShows((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Shows</h1>
      <form
        onSubmit={handleCreate}
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
          required
        />
        <input
          type="time"
          value={form.showTime}
          onChange={(e) => setForm((p) => ({ ...p, showTime: e.target.value }))}
          required
        />
        <button type="submit">Add show</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {shows.map((show) => (
            <tr key={show.id}>
              <td>{new Date(show.date).toLocaleDateString()}</td>
              <td>{formatShowTime(show.showTime)}</td>
              <td>
                {show.activeAt ? (
                  show.lockedAt ? (
                    <span style={{ color: "var(--warning)" }}>Locked</span>
                  ) : (
                    <span style={{ color: "var(--success)" }}>Active</span>
                  )
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>—</span>
                )}
              </td>
              <td>
                {!show.activeAt && (
                  <button onClick={() => handleActivate(show.id)}>
                    Activate
                  </button>
                )}
                {show.activeAt && !show.lockedAt && (
                  <>
                    <Link to="/admin/qr">Show QR</Link>
                    <button onClick={() => handleLock(show.id)}>Lock</button>
                  </>
                )}
                {show.lockedAt && (
                  <button onClick={() => handleUnlock(show.id)}>Unlock</button>
                )}
                <button onClick={() => handleDelete(show.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

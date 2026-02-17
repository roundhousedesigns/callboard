import { useState, useRef } from "react";
import { formatShowTime } from "../../lib/dateUtils";

interface ImportResult {
  createdCount: number;
  skippedCount: number;
  createdShows?: Array<{ date: string; showTime: string }>;
  skippedShows?: Array<{ date: string; showTime: string }>;
}

export function CalendarImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("skipDuplicates", String(skipDuplicates));

      const res = await fetch("/api/shows/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Import Performance Calendar</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Upload a CSV or Excel file with columns <code>date</code> (YYYY-MM-DD) and{" "}
        <code>showTime</code>, <code>time</code>, or <code>label</code>. Accepts 24h (14:00),
        12h (2:00 PM), or labels (Matinee, Evening).
      </p>
      <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
          />
          Skip duplicate shows (same date + time)
        </label>
        <button type="submit" disabled={!file || loading}>
          {loading ? "Importing..." : "Import"}
        </button>
      </form>
      {error && <div style={{ color: "var(--error)", marginBottom: "1rem" }}>{error}</div>}
      {result && (
        <div style={{ padding: "1rem", background: "var(--bg-elevated)", borderRadius: "6px" }}>
          <p>
            Created: <strong>{result.createdCount}</strong> | Skipped:{" "}
            <strong>{result.skippedCount}</strong>
          </p>
          {result.createdShows && result.createdShows.length > 0 && (
            <details>
              <summary>Created shows</summary>
              <ul style={{ marginTop: "0.5rem" }}>
                {result.createdShows.map((s, i) => (
                  <li key={i}>
                    {s.date} — {formatShowTime(s.showTime)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
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

export function QRDisplayPage() {
  const [show, setShow] = useState<Show | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadActiveShow() {
    setError(null);
    api
      .get<Show>("/shows/active")
      .then(setShow)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed");
        setShow(null);
      });
  }

  useEffect(() => {
    loadActiveShow();
  }, []);

  if (error) {
    const isNoActive = error.toLowerCase().includes("no active show");
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          padding: "2rem",
        }}
      >
        <h2 style={{ color: isNoActive ? "var(--text-muted)" : "var(--error)" }}>
          {isNoActive ? "No active show" : error}
        </h2>
        {isNoActive && (
          <p style={{ color: "var(--text-muted)" }}>
            Open sign-in for a show from the Shows page to display the QR code.
          </p>
        )}
        <button className="no-print" type="button" onClick={loadActiveShow}>
          Refresh
        </button>
      </div>
    );
  }
  if (!show) return <div>Loading...</div>;
  if (!show.signInToken) {
    return (
      <div>
        <p>No active show. Open sign-in for a show from the Shows page first.</p>
      </div>
    );
  }
  if (show.lockedAt) {
    return (
      <div>
        <h2>No active show</h2>
        <p style={{ color: "var(--text-muted)" }}>
          {new Date(show.date).toLocaleDateString()} — {formatShowTime(show.showTime)}
        </p>
        <p>This show has been closed for sign-in.</p>
      </div>
    );
  }

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5173";
  const signInUrl = `${baseUrl}/s/${show.signInToken}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        padding: "2rem",
      }}
    >
      <h1>Scan to sign in</h1>
      <p style={{ color: "var(--text-muted)" }}>
        {new Date(show.date).toLocaleDateString()} — {formatShowTime(show.showTime)}
      </p>
      <button className="no-print" type="button" onClick={() => window.print()}>
        Print QR sheet
      </button>
      <div
        style={{
          padding: "1.5rem",
          background: "white",
          borderRadius: "8px",
        }}
      >
        <QRCodeSVG value={signInUrl} size={256} level="H" />
      </div>
      <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
        Actors must be logged in to sign in.
      </p>
    </div>
  );
}

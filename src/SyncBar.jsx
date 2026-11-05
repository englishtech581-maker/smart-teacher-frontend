import React, { useState, useEffect } from "react";
import { syncStatus, syncNow, discardQueued } from "./api";

let installEvent = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvent = e; window.dispatchEvent(new CustomEvent("sta-sync")); });
  window.addEventListener("appinstalled", () => { installEvent = null; window.dispatchEvent(new CustomEvent("sta-sync")); });
}

// A thin strip at the top: offline notice, changes waiting to be sent, changes the server refused, and the install button.
export default function SyncBar() {
  const [s, setS] = useState(syncStatus());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const f = () => setS(syncStatus());
    ["sta-sync", "online", "offline"].forEach((ev) => window.addEventListener(ev, f));
    return () => ["sta-sync", "online", "offline"].forEach((ev) => window.removeEventListener(ev, f));
  }, []);
  async function send() { setBusy(true); try { await syncNow(); } finally { setBusy(false); setS(syncStatus()); } }
  async function install() { if (!installEvent) return; installEvent.prompt(); try { await installEvent.userChoice; } catch { /* ignore */ } installEvent = null; setS(syncStatus()); }

  const bar = { fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
  return (
    <div className="sta-noprint">
      {s.offline && <div style={{ ...bar, background: "#F6E7C5", color: "#6B4A10" }}>📴 No internet. Saved pages still open, and attendance and marks you enter are kept on this phone.</div>}
      {s.pending > 0 && (
        <div style={{ ...bar, background: "#E3EEE8", color: "#1F3A34", justifyContent: "space-between" }}>
          <span>⏳ {s.pending} {s.pending === 1 ? "change is" : "changes are"} waiting to be sent{s.offline ? " (will send when you are online)" : ""}.</span>
          {!s.offline && <button className="sta-btn small" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send now"}</button>}
        </div>
      )}
      {s.failed.map((f) => (
        <div key={f.id} style={{ ...bar, background: "#F3DCDC", color: "#6E2B2B", justifyContent: "space-between" }}>
          <span>⚠️ {f.label} could not be saved: {f.reason}</span>
          <button className="sta-btn small ghost" onClick={() => { discardQueued(f.id); setS(syncStatus()); }}>Discard</button>
        </div>
      ))}
      {installEvent && (
        <div style={{ ...bar, background: "#EFE7D4", color: "#1F3A34", justifyContent: "space-between" }}>
          <span>Install this app on your phone to open it like a normal app.</span>
          <button className="sta-btn small" onClick={install}>Install</button>
        </div>
      )}
    </div>
  );
}

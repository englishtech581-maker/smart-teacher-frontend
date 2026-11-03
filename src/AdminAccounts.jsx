import React, { useState } from "react";
import { api } from "./api";

// For people who cannot use the email link (parents with a phone number, or when email is not set up).
export default function AdminAccounts() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [shown, setShown] = useState(null);
  const [error, setError] = useState("");
  async function search() { setError(""); setShown(null); try { setRows(await api.listUsers(q)); } catch (e) { setError(e.message); } }
  async function reset(u) {
    if (!window.confirm(`Give ${u.name} a new password? Their old password will stop working.`)) return;
    setError("");
    try { const r = await api.resetUserPassword(u.id); setShown({ name: u.name, login: u.email, pw: r.tempPassword }); } catch (e) { setError(e.message); }
  }
  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 6 }}>Forgotten passwords</h3>
      <div className="sta-small" style={{ marginBottom: 10 }}>Find a teacher or parent and give them a new password. Tell it to them and ask them to keep it safe.</div>
      <div className="sta-row">
        <input className="sta-input" style={{ marginBottom: 0 }} placeholder="Name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <button className="sta-btn small" style={{ flex: "0 0 auto" }} onClick={search}>Search</button>
      </div>
      {rows && rows.length === 0 && <div className="sta-empty">No account found.</div>}
      {rows && rows.length > 0 && <table className="sta-table" style={{ marginTop: 10 }}><tbody>{rows.map((u) => (
        <tr key={u.id}><td><b>{u.name}</b><div className="sta-small">{u.role} · {u.email}</div></td><td><button className="sta-btn small secondary" onClick={() => reset(u)}>New password</button></td></tr>
      ))}</tbody></table>}
      {shown && (
        <div className="sta-note" style={{ marginTop: 10 }}>
          New password for <b>{shown.name}</b> (login: {shown.login}):
          <div className="sta-schoolid" style={{ fontSize: 18, margin: "6px 0" }}>{shown.pw}</div>
          It is shown only now. They can use it to log in.
        </div>
      )}
      {error && <div className="sta-error">{error}</div>}
    </div>
  );
}

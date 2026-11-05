import React, { useState } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Owner-only page (open it with  yoursite/?owner ). The owner key lives only in this page's memory.
export default function OwnerPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [codes, setCodes] = useState([]);
  const [schools, setSchools] = useState([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function call(path, method = "GET", body, k = key) {
    const res = await fetch(`${BASE}/owner${path}`, { method, headers: { "Content-Type": "application/json", "x-owner-key": k }, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  async function load(k = key) {
    const [c, s] = await Promise.all([call("/codes", "GET", null, k), call("/schools", "GET", null, k)]);
    setCodes(c); setSchools(s);
  }
  async function enter(e) {
    e.preventDefault(); setError("");
    try { await load(key); setAuthed(true); } catch (err) { setError(err.message); }
  }
  async function make() {
    setError("");
    try { await call("/codes", "POST", { note }); setNote(""); await load(); } catch (err) { setError(err.message); }
  }
  async function remove(c) {
    try { await call(`/codes/${c.id}`, "DELETE"); await load(); } catch (err) { setError(err.message); }
  }
  function copy(code) {
    try { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(""), 1500); } catch {}
  }

  if (!authed) {
    return (
      <form className="sta-card" onSubmit={enter} style={{ maxWidth: 420, margin: "40px auto" }}>
        <h3>Owner access</h3>
        <span className="sta-label">Owner key</span>
        <input className="sta-input" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
        <button className="sta-btn" disabled={!key}>Open</button>
        {error && <div className="sta-error">{error}</div>}
      </form>
    );
  }
  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "");
  return (
    <div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 6 }}>Invite a new school</h3>
        <div className="sta-small" style={{ marginBottom: 10 }}>Make a code, send it to the school, and they enter it when they create their admin account. Each code works once.</div>
        <input className="sta-input" value={note} placeholder="Who is it for? (e.g. Al-Noor School, Karachi)" onChange={(e) => setNote(e.target.value)} />
        <button className="sta-btn" onClick={make}>Make a code</button>
        {error && <div className="sta-error">{error}</div>}
      </div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>Codes</h3>
        {codes.length === 0 ? <div className="sta-empty">No codes yet.</div> : (
          <div className="sta-scroll"><table className="sta-table">
            <thead><tr><th>Code</th><th>For</th><th>Made</th><th>Status</th><th></th></tr></thead>
            <tbody>{codes.map((c) => (
              <tr key={c.id}>
                <td><b style={{ letterSpacing: 1 }}>{c.code}</b></td><td>{c.note}</td><td>{fmt(c.created_at)}</td>
                <td>{c.used_at ? `Used by ${c.school || "a school"} on ${fmt(c.used_at)}` : "Not used yet"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{!c.used_at && <><button className="sta-linkbtn" onClick={() => copy(c.code)}>{copied === c.code ? "Copied" : "Copy"}</button> · <button className="sta-linkbtn" onClick={() => remove(c)}>Delete</button></>}</td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>Schools on the app</h3>
        {schools.length === 0 ? <div className="sta-empty">No schools yet.</div> : (
          <div className="sta-scroll"><table className="sta-table">
            <thead><tr><th>School</th><th>Admin login</th><th>Students</th><th>Teachers</th><th>Since</th></tr></thead>
            <tbody>{schools.map((s) => <tr key={s.id}><td><b>{s.name}</b></td><td>{s.admin_email}</td><td>{s.students}</td><td>{s.teachers}</td><td>{fmt(s.created_at)}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
}

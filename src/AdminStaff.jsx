import React, { useState, useEffect, Suspense, lazy } from "react";
import { api } from "./api";

// The spreadsheet reader is large, so it is only downloaded when the upload screen is opened.
const ImportPanel = lazy(() => import("./ImportPanel.jsx"));

const MODES = [["list", "All staff"], ["add", "Add one person"], ["upload", "Upload a file"]];
const ROLES = ["Teacher", "Coordinator", "Vice principal", "Accountant", "Clerk", "Librarian", "Lab assistant", "Driver", "Support staff"];
const EMPTY = { name: "", role: "", department: "", phone: "", email: "", joinedOn: "" };
const explain = (err) => (err.message === "Not found" ? "The server has not been updated yet. Finish piece 1 first." : err.message);

const niceDate = (d) => (d ? String(d).slice(0, 10) : "");

export default function AdminStaff() {
  const [mode, setMode] = useState("list");
  const [staff, setStaff] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0); // add 1 to reload the list
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listStaff().then((s) => { setStaff(s); setError(""); }).catch((err) => setError(explain(err)));
  }, [version]);

  async function add() {
    setSaving(true);
    setMsg({ ok: "", error: "" });
    try {
      await api.addStaff(form);
      setMsg({ ok: `${form.name} was added.`, error: "" });
      setForm(EMPTY);
      setVersion((v) => v + 1);
    } catch (err) {
      setMsg({ ok: "", error: explain(err) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(p) {
    if (!window.confirm(`Remove ${p.name} from the staff list?`)) return;
    try {
      await api.deleteStaff(p.id);
      setStaff((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      setError(explain(err));
    }
  }

  const needle = q.trim().toLowerCase();
  const shown = (staff || []).filter((p) => !needle || [p.name, p.role, p.department, p.phone].some((v) => (v || "").toLowerCase().includes(needle)));

  return (
    <div>
      <div className="sta-tabs">
        {MODES.map(([k, l]) => <button key={k} className={`sta-tab ${mode === k ? "active" : ""}`} onClick={() => setMode(k)}>{l}</button>)}
      </div>

      {mode === "list" && (
        <div className="sta-card">
          <span className="sta-label">Search by name, role, department or phone</span>
          <input className="sta-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search" />
          {error && <div className="sta-error">{error}</div>}
          {staff === null && !error && <div className="sta-loading">Loading…</div>}
          {staff && staff.length === 0 && (
            <div className="sta-empty">
              No staff yet.
              <div style={{ marginTop: 10 }}><button className="sta-btn small" onClick={() => setMode("upload")}>Upload your staff list</button></div>
            </div>
          )}
          {staff && staff.length > 0 && shown.length === 0 && <div className="sta-empty">No one matches.</div>}
          {shown.length > 0 && (
            <>
              <div className="sta-small" style={{ marginBottom: 8 }}>{shown.length === staff.length ? `${staff.length} staff` : `${shown.length} of ${staff.length} staff`}</div>
              <div className="sta-scroll">
                <table className="sta-table">
                  <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Phone</th><th>Joined</th><th></th></tr></thead>
                  <tbody>
                    {shown.map((p) => (
                      <tr key={p.id}>
                        <td><b>{p.name}</b></td>
                        <td>{p.role || ""}</td>
                        <td>{p.department || ""}</td>
                        <td>{p.phone || ""}</td>
                        <td>{niceDate(p.joined_on)}</td>
                        <td><button className="sta-linkbtn" onClick={() => remove(p)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="sta-note">This is the school's record of everyone who works here. A teacher who logs in to the app needs an account too, which they make with your School ID.</div>
        </div>
      )}

      {mode === "add" && (
        <div className="sta-card">
          <h3 style={{ marginBottom: 12 }}>Add one person</h3>
          <div className="sta-grid2">
            <div><span className="sta-label">Name *</span><input className="sta-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <span className="sta-label">Role</span>
              <input className="sta-input" list="staff-roles" placeholder="e.g. Teacher" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              <datalist id="staff-roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
            </div>
            <div><span className="sta-label">Department or subject</span><input className="sta-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div><span className="sta-label">Phone</span><input className="sta-input" placeholder="03001234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><span className="sta-label">Email (if any)</span><input className="sta-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><span className="sta-label">Joined on</span><input className="sta-input" type="date" value={form.joinedOn} onChange={(e) => setForm({ ...form, joinedOn: e.target.value })} /></div>
          </div>
          <button className="sta-btn" onClick={add} disabled={saving || !form.name.trim()}>{saving ? "Adding..." : "Add"}</button>
          {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
          {msg.error && <div className="sta-error">{msg.error}</div>}
        </div>
      )}

      {mode === "upload" && (
        <Suspense fallback={<div className="sta-loading">Loading…</div>}>
          <ImportPanel type="staff" onDone={() => setVersion((v) => v + 1)} />
        </Suspense>
      )}
    </div>
  );
}

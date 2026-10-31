import React, { useState, useEffect, Suspense, lazy } from "react";
import { api } from "./api";
// The spreadsheet reader is large, so it is only downloaded when the upload screen is opened.
const ImportPanel = lazy(() => import("./ImportPanel.jsx"));

const MODES = [["list", "All students"], ["add", "Add one student"], ["upload", "Upload a file"]];
const EMPTY = { name: "", admissionNo: "", className: "", gender: "", guardianName: "", parentPhone: "", parentEmail: "" };
const explain = (err) => (err.message === "Not found" ? "The server has not been updated yet. Finish piece 1 first." : err.message);

export default function AdminStudents() {
  const [mode, setMode] = useState("list");
  const [q, setQ] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [data, setData] = useState(null); // { students, total }
  const [sections, setSections] = useState([]);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0); // add 1 to reload the list
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.getSections().then(setSections).catch(() => {}); }, [version]);

  // search as you type, after a short pause
  useEffect(() => {
    const t = setTimeout(() => {
      api.listPeopleStudents(q, sectionId).then((d) => { setData(d); setError(""); }).catch((err) => setError(explain(err)));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, sectionId, version]);

  async function add() {
    setSaving(true);
    setMsg({ ok: "", error: "" });
    try {
      await api.addPersonStudent(form);
      setMsg({ ok: `${form.name} was added.`, error: "" });
      setForm(EMPTY);
      setVersion((v) => v + 1);
    } catch (err) {
      setMsg({ ok: "", error: explain(err) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(s) {
    if (!window.confirm(`Remove ${s.name} from the school? Their marks and attendance are removed too.`)) return;
    try {
      await api.deletePersonStudent(s.id);
      setData((d) => ({ students: d.students.filter((x) => x.id !== s.id), total: d.total - 1 }));
    } catch (err) {
      setError(explain(err));
    }
  }

  const label = (s) => (s.grade ? `${s.grade}-${s.section}` : "Not in a class");

  return (
    <div>
      <div className="sta-tabs">
        {MODES.map(([k, l]) => <button key={k} className={`sta-tab ${mode === k ? "active" : ""}`} onClick={() => setMode(k)}>{l}</button>)}
      </div>

      {mode === "list" && (
        <div className="sta-card">
          <div className="sta-grid2">
            <div>
              <span className="sta-label">Search by name, admission number or phone</span>
              <input className="sta-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search" />
            </div>
            <div>
              <span className="sta-label">Class</span>
              <select className="sta-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">All classes</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.grade}-{s.name}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="sta-error">{error}</div>}
          {data === null && !error && <div className="sta-loading">Loading…</div>}
          {data && data.students.length === 0 && (
            <div className="sta-empty">
              {q || sectionId ? "No students match." : "No students yet."}
              {!q && !sectionId && <div style={{ marginTop: 10 }}><button className="sta-btn small" onClick={() => setMode("upload")}>Upload your student list</button></div>}
            </div>
          )}
          {data && data.students.length > 0 && (
            <>
              <div className="sta-small" style={{ marginBottom: 8 }}>
                {data.total > data.students.length ? `Showing ${data.students.length} of ${data.total} students. Search to narrow the list.` : `${data.total} student${data.total === 1 ? "" : "s"}`}
              </div>
              <div className="sta-scroll">
                <table className="sta-table">
                  <thead><tr><th>Name</th><th>Admission no.</th><th>Class</th><th>Guardian</th><th>Parent phone</th><th></th></tr></thead>
                  <tbody>
                    {data.students.map((s) => (
                      <tr key={s.id}>
                        <td><b>{s.name}</b></td>
                        <td>{s.admission_no || ""}</td>
                        <td>{label(s)}</td>
                        <td>{s.guardian_name || ""}</td>
                        <td>{s.parent_phone || ""}</td>
                        <td><button className="sta-linkbtn" onClick={() => remove(s)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {mode === "add" && (
        <div className="sta-card">
          <h3 style={{ marginBottom: 12 }}>Add one student</h3>
          <div className="sta-grid2">
            <div><span className="sta-label">Student name *</span><input className="sta-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><span className="sta-label">Admission number</span><input className="sta-input" value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} /></div>
            <div>
              <span className="sta-label">Class and section</span>
              <input className="sta-input" list="class-options" placeholder="e.g. 7-A" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
              <datalist id="class-options">{sections.map((s) => <option key={s.id} value={`${s.grade}-${s.name}`} />)}</datalist>
            </div>
            <div>
              <span className="sta-label">Gender</span>
              <select className="sta-select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Not given</option><option>Male</option><option>Female</option>
              </select>
            </div>
            <div><span className="sta-label">Guardian name</span><input className="sta-input" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></div>
            <div><span className="sta-label">Parent phone</span><input className="sta-input" placeholder="03001234567" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} /></div>
            <div><span className="sta-label">Parent email (if any)</span><input className="sta-input" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} /></div>
          </div>
          <button className="sta-btn" onClick={add} disabled={saving || !form.name.trim()}>{saving ? "Adding..." : "Add student"}</button>
          {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
          {msg.error && <div className="sta-error">{msg.error}</div>}
        </div>
      )}

      {mode === "upload" && (
        <Suspense fallback={<div className="sta-loading">Loading…</div>}>
          <ImportPanel type="students" onDone={() => setVersion((v) => v + 1)} />
        </Suspense>
      )}
    </div>
  );
}

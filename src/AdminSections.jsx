import React, { useState, useEffect } from "react";
import { api } from "./api";

// "6, 7, 8" -> ["6","7","8"], "6-10" -> ["6","7","8","9","10"], "A-C" -> ["A","B","C"]
function expand(text) {
  const out = [];
  for (const tok of String(text).split(/[,\s]+/).filter(Boolean)) {
    const num = tok.match(/^(\d+)-(\d+)$/);
    const let_ = tok.match(/^([A-Za-z])-([A-Za-z])$/);
    if (num && Number(num[2]) >= Number(num[1]) && Number(num[2]) - Number(num[1]) < 30) {
      for (let i = Number(num[1]); i <= Number(num[2]); i++) out.push(String(i));
    } else if (let_ && let_[2].toUpperCase() >= let_[1].toUpperCase()) {
      for (let c = let_[1].toUpperCase().charCodeAt(0); c <= let_[2].toUpperCase().charCodeAt(0); c++) out.push(String.fromCharCode(c));
    } else out.push(tok);
  }
  return [...new Set(out)];
}

export default function AdminSections({ user }) {
  const [sections, setSections] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ grades: "", letters: "A" });
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const [flash, setFlash] = useState({}); // section id -> "Saved"

  async function load() {
    try {
      const [s, t] = await Promise.all([api.getSections(), api.getTeachers()]);
      setSections(s);
      setTeachers(t);
    } catch (err) {
      setSections([]);
      setMsg({ ok: "", error: err.message === "Not found" ? "The server has not been updated yet. Finish piece 1 first." : err.message });
    }
  }
  useEffect(() => { load(); }, []);

  async function assign(sec, teacherId) {
    setMsg({ ok: "", error: "" });
    try {
      await api.setClassTeacher(sec.id, teacherId || null);
      const t = teachers.find((x) => x.id === teacherId);
      setSections((list) => list.map((x) => (x.id === sec.id ? { ...x, class_teacher_id: teacherId || null, class_teacher_name: t ? t.name : null } : x)));
      setFlash((f) => ({ ...f, [sec.id]: "Saved" }));
      setTimeout(() => setFlash((f) => ({ ...f, [sec.id]: "" })), 1500);
    } catch (err) {
      setMsg({ ok: "", error: err.message });
    }
  }

  async function addMany() {
    const grades = expand(form.grades);
    const letters = expand(form.letters);
    if (!grades.length || !letters.length) { setMsg({ ok: "", error: "Type the classes, for example 6-10, and the sections, for example A, B." }); return; }
    if (grades.length * letters.length > 60) { setMsg({ ok: "", error: "That is too many at once. Add up to 60 sections at a time." }); return; }
    setAdding(true);
    setMsg({ ok: "", error: "" });
    let added = 0, existed = 0;
    try {
      for (const g of grades) for (const l of letters) {
        try { await api.addSection({ grade: g, name: l }); added++; }
        catch (err) { if (/already exists/.test(err.message)) existed++; else throw err; }
      }
      setMsg({ ok: `${added} section${added === 1 ? "" : "s"} added${existed ? `, ${existed} already existed` : ""}.`, error: "" });
      setForm({ grades: "", letters: form.letters });
      await load();
    } catch (err) {
      setMsg({ ok: "", error: err.message });
    } finally {
      setAdding(false);
    }
  }

  async function remove(sec) {
    if (!window.confirm(`Delete class ${sec.grade}-${sec.name}?`)) return;
    try {
      await api.deleteSection(sec.id);
      setSections((list) => list.filter((x) => x.id !== sec.id));
    } catch (err) {
      setMsg({ ok: "", error: err.message });
    }
  }

  return (
    <div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 6 }}>Add classes and sections</h3>
        <div className="sta-small" style={{ marginBottom: 12 }}>Type a list or a range. For example classes <b>6-10</b> and sections <b>A, B</b> make 6-A, 6-B, 7-A and so on up to 10-B.</div>
        <div className="sta-grid2">
          <div>
            <span className="sta-label">Classes</span>
            <input className="sta-input" value={form.grades} placeholder="e.g. 6-10" onChange={(e) => setForm({ ...form, grades: e.target.value })} />
          </div>
          <div>
            <span className="sta-label">Sections</span>
            <input className="sta-input" value={form.letters} placeholder="e.g. A, B" onChange={(e) => setForm({ ...form, letters: e.target.value })} />
          </div>
        </div>
        <button className="sta-btn" onClick={addMany} disabled={adding}>{adding ? "Adding..." : "Add"}</button>
        {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
        {msg.error && <div className="sta-error">{msg.error}</div>}
      </div>

      <div className="sta-card">
        <h3 style={{ marginBottom: 12 }}>Classes and class teachers</h3>
        {sections === null && <div className="sta-loading">Loading…</div>}
        {sections && sections.length === 0 && <div className="sta-empty">No classes yet. Add some above.</div>}
        {sections && sections.length > 0 && teachers.length === 0 && (
          <div className="sta-note" style={{ marginTop: 0, marginBottom: 12 }}>
            No teacher has an account yet. Teachers create their account with your School ID ({user.schoolId || user.school_id}) and then appear in the lists below.
          </div>
        )}
        {sections && sections.length > 0 && (
          <div className="sta-scroll">
            <table className="sta-table">
              <thead><tr><th>Class</th><th>Students</th><th>Class teacher</th><th></th></tr></thead>
              <tbody>
                {sections.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.grade}-{s.name}</b></td>
                    <td>{s.students}</td>
                    <td>
                      <select className="sta-select" style={{ marginBottom: 0, minWidth: 180 }} value={s.class_teacher_id || ""} onChange={(e) => assign(s, e.target.value)}>
                        <option value="">Not assigned</option>
                        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <span className="sta-small" style={{ marginLeft: 8 }}>{flash[s.id]}</span>
                    </td>
                    <td><button className="sta-linkbtn" disabled={s.students > 0} title={s.students > 0 ? "Move the students first" : ""} onClick={() => remove(s)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

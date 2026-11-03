import React, { useState, useEffect } from "react";
import { api } from "./api";
import UploadBox from "./UploadBox.jsx";

export const money = (n) => "Rs " + Number(n || 0).toLocaleString("en-PK");
const secName = (s) => `${s.grade}-${s.name}`;

/* ---------- Search for a student (admin) ---------- */
export function StudentPicker({ onPick }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) { setRows([]); return; }
    const t = setTimeout(() => api.listPeopleStudents(q).then((r) => setRows(r.students.slice(0, 8))).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="sta-card sta-noprint">
      <span className="sta-label">Find a student by name, admission number or parent phone</span>
      <input className="sta-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 2 letters" />
      {rows.map((s) => (
        <div key={s.id} className="sta-pickrow" onClick={() => { onPick(s); setQ(""); setRows([]); }}>
          <b>{s.name}</b> <span className="sta-small">{s.grade ? `Class ${s.grade}-${s.section}` : "No class"} · {s.admission_no || "no adm. no."}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Enter marks for one exam, section and subject ---------- */
export function MarksEntry({ sections, defaultSubject = "", fixedSection = false }) {
  const [exams, setExams] = useState(null);
  const [examId, setExamId] = useState("");
  const [sectionId, setSectionId] = useState(sections[0] ? sections[0].id : "");
  const [subject, setSubject] = useState(defaultSubject);
  const [total, setTotal] = useState("100");
  const [rows, setRows] = useState(null);
  const [vals, setVals] = useState({});
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.listExams().then((e) => { setExams(e); if (e[0]) setExamId(e[0].id); }).catch((e) => setMsg({ ok: "", error: e.message })); }, []);

  async function load() {
    setMsg({ ok: "", error: "" });
    try {
      const r = await api.examSheet(examId, sectionId, subject.trim());
      setRows(r);
      const v = {};
      r.forEach((x) => { v[x.id] = x.marks === null || x.marks === undefined ? "" : String(x.marks); });
      setVals(v);
      const had = r.find((x) => x.total);
      if (had) setTotal(String(had.total));
    } catch (e) { setRows(null); setMsg({ ok: "", error: e.message }); }
  }

  async function save() {
    setBusy(true); setMsg({ ok: "", error: "" });
    try {
      const r = await api.saveMarks(examId, { sectionId, subject: subject.trim(), total: Number(total), marks: rows.map((x) => ({ studentId: x.id, marks: vals[x.id] })) });
      setMsg(r.problems.length ? { ok: "", error: `${r.saved} saved. ${r.problems.length} not saved because the marks are more than ${total} or not a number.` } : { ok: `${r.saved} marks saved.`, error: "" });
    } catch (e) { setMsg({ ok: "", error: e.message }); } finally { setBusy(false); }
  }

  if (exams && exams.length === 0) return <div className="sta-empty">No exam has been created yet. The principal creates exams in the Exams tab first.</div>;
  return (
    <div className="sta-card">
      <div className="sta-grid2">
        <div><span className="sta-label">Exam</span>
          <select className="sta-select" value={examId} onChange={(e) => { setExamId(e.target.value); setRows(null); }}>
            {(exams || []).map((e) => <option key={e.id} value={e.id}>{e.name} {e.year}</option>)}
          </select></div>
        <div><span className="sta-label">Class and section</span>
          <select className="sta-select" value={sectionId} disabled={fixedSection} onChange={(e) => { setSectionId(e.target.value); setRows(null); }}>
            {sections.map((s) => <option key={s.id} value={s.id}>{secName(s)}</option>)}
          </select></div>
        <div><span className="sta-label">Subject</span>
          <input className="sta-input" value={subject} onChange={(e) => { setSubject(e.target.value); setRows(null); }} placeholder="e.g. Mathematics" /></div>
        <div><span className="sta-label">Total marks</span>
          <input className="sta-input" type="number" min="1" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
      </div>
      <button className="sta-btn secondary" disabled={!examId || !sectionId || !subject.trim()} onClick={load}>Open the marks sheet</button>
      {rows && rows.length === 0 && <div className="sta-empty">No students in this section yet.</div>}
      {rows && rows.length > 0 && (
        <>
          <table className="sta-table" style={{ marginTop: 12 }}>
            <thead><tr><th>Student</th><th>Marks out of {total}</th></tr></thead>
            <tbody>{rows.map((s) => (
              <tr key={s.id}><td>{s.name}<div className="sta-small">{s.admission_no || ""}</div></td>
                <td><input className="sta-mini-input" type="number" min="0" max={total} value={vals[s.id] ?? ""} onChange={(e) => setVals({ ...vals, [s.id]: e.target.value })} /></td></tr>
            ))}</tbody>
          </table>
          <button className="sta-btn" style={{ marginTop: 12 }} onClick={save} disabled={busy}>{busy ? "Saving..." : "Save marks"}</button>
          <div className="sta-note">Leave a box empty for an absent student. Saving again changes the marks, it never adds a second copy.</div>
        </>
      )}
      {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
      {msg.error && <div className="sta-error">{msg.error}</div>}
      {examId && <UploadBox type="marks" extra={{ examId }} onDone={() => { if (rows) load(); }} title="Upload marks from Excel (all subjects at once)" />}
    </div>
  );
}

/* ---------- Co-curricular marks for one student ---------- */
const CATS = ["Sports", "Arts", "Debate", "Science fair", "Community service", "Other"];
export function ActivitiesPanel({ studentId, canDelete = true }) {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ category: "Sports", activity: "", marks: "", total: "10", note: "" });
  const [error, setError] = useState("");
  const load = () => api.listActivities(studentId).then(setList).catch((e) => setError(e.message));
  useEffect(() => { setList(null); load(); }, [studentId]);
  async function add() {
    setError("");
    try { await api.addActivity({ ...f, studentId }); setF({ ...f, activity: "", marks: "", note: "" }); load(); } catch (e) { setError(e.message); }
  }
  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 10 }}>Co-curricular activities</h3>
      {list === null && <div className="sta-loading">Loading…</div>}
      {list && list.length === 0 && <div className="sta-empty">Nothing recorded yet.</div>}
      {list && list.length > 0 && (
        <table className="sta-table"><tbody>{list.map((a) => (
          <tr key={a.id}><td><b>{a.activity}</b><div className="sta-small">{a.category || ""} {a.note ? "· " + a.note : ""}</div></td>
            <td>{a.marks !== null ? `${a.marks}/${a.total ?? "?"}` : "-"}</td>
            <td>{canDelete && <button className="sta-linkbtn" onClick={() => api.deleteActivity(a.id).then(load)}>Remove</button>}</td></tr>
        ))}</tbody></table>
      )}
      <hr className="sta-divider" />
      <div className="sta-grid2">
        <div><span className="sta-label">Type</span><select className="sta-select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><span className="sta-label">Activity *</span><input className="sta-input" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value })} placeholder="e.g. Inter-school cricket" /></div>
        <div><span className="sta-label">Marks</span><input className="sta-input" type="number" value={f.marks} onChange={(e) => setF({ ...f, marks: e.target.value })} /></div>
        <div><span className="sta-label">Out of</span><input className="sta-input" type="number" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} /></div>
      </div>
      <span className="sta-label">Note (optional)</span>
      <input className="sta-input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      <button className="sta-btn" disabled={!f.activity.trim()} onClick={add}>Add activity</button>
      {error && <div className="sta-error">{error}</div>}
    </div>
  );
}

/* ---------- The report card itself (also used by parents) ---------- */
export function ReportCardView({ card }) {
  const ev = card.evaluation;
  return (
    <div className="sta-card sta-printarea">
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700 }}>{card.school}</div>
        <div className="sta-small">Report card {card.year}</div>
      </div>
      <div className="sta-grid2">
        <div><b>{card.student.name}</b></div>
        <div className="sta-small">{card.student.grade ? `Class ${card.student.grade}-${card.student.section}` : "No class"} · Adm. no. {card.student.admissionNo || "-"}</div>
      </div>
      {card.exams.length === 0 && <div className="sta-empty">No marks have been entered for {card.year} yet.</div>}
      {card.exams.map((e) => (
        <div key={e.id}>
          <div className="sta-section-title">{e.name}{e.term ? ` (${e.term})` : ""}</div>
          <div className="sta-scroll"><table className="sta-table">
            <thead><tr><th>Subject</th><th>Marks</th><th>Out of</th><th>%</th><th>Grade</th></tr></thead>
            <tbody>
              {e.subjects.map((s) => <tr key={s.subject}><td>{s.subject}</td><td>{s.marks}</td><td>{s.total}</td><td>{s.pct}</td><td><b>{s.grade}</b></td></tr>)}
              <tr><td><b>Total</b></td><td><b>{e.got}</b></td><td><b>{e.max}</b></td><td><b>{e.pct}</b></td><td><b>{e.grade}</b></td></tr>
            </tbody></table></div>
          <div className="sta-small" style={{ marginTop: 6 }}>
            {e.position ? <>Position in class: <b>{e.position}</b> of {e.of} · </> : null}
            Result: <b style={{ color: e.failedIn && e.failedIn.length ? "var(--maroon)" : "var(--sage)" }}>{e.failedIn && e.failedIn.length ? `Fail (${e.failedIn.join(", ")})` : "Pass"}</b>
          </div>
        </div>
      ))}
      {card.activities.length > 0 && (
        <>
          <div className="sta-section-title">Co-curricular activities</div>
          <table className="sta-table"><tbody>{card.activities.map((a) => <tr key={a.id}><td>{a.activity} <span className="sta-small">{a.category || ""}</span></td><td>{a.marks !== null ? `${a.marks}/${a.total ?? "?"}` : ""}</td></tr>)}</tbody></table>
        </>
      )}
      <div className="sta-section-title">Annual evaluation</div>
      {ev.overall === null ? <div className="sta-small">Not enough information yet.</div> : (
        <>
          <table className="sta-table"><thead><tr><th>Part</th><th>Score %</th><th>Weight</th></tr></thead>
            <tbody>{ev.parts.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.pct}</td><td>{p.weight}%</td></tr>)}</tbody></table>
          <div style={{ marginTop: 10, fontSize: 15 }}>Overall: <b>{ev.overall}%</b> · Grade <b>{ev.grade}</b> · {ev.remark}</div>
        </>
      )}
      {card.conduct && <div className="sta-small" style={{ marginTop: 8 }}>Conduct: <b>{card.conduct.status}</b>{card.conduct.notes ? ` (${card.conduct.notes})` : ""}</div>}
      <button className="sta-btn secondary sta-noprint" style={{ marginTop: 14 }} onClick={() => window.print()}>Print this report card</button>
    </div>
  );
}

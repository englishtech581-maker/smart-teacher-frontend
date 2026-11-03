import React, { useState, useEffect } from "react";
import { api } from "./api";
import UploadBox from "./UploadBox.jsx";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

// Weekly grid: rows are periods, columns are days. Each box holds a subject and the teacher.
export default function AdminTimetable() {
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [cells, setCells] = useState(null);
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const [busy, setBusy] = useState(false);
  const [ver, setVer] = useState(0);

  useEffect(() => {
    api.getSections().then((s) => { setSections(s); if (s[0]) setSectionId(s[0].id); }).catch(() => {});
    api.getTeachers().then(setTeachers).catch(() => {});
  }, []);
  useEffect(() => {
    if (!sectionId) return;
    setCells(null); setMsg({ ok: "", error: "" });
    api.getTimetable(sectionId).then((rows) => {
      const c = {};
      rows.forEach((r) => { c[`${r.day}-${r.period}`] = { subject: r.subject, teacherId: r.teacher_id || "" }; });
      setCells(c);
    }).catch((e) => setMsg({ ok: "", error: e.message }));
  }, [sectionId, ver]);

  const set = (key, patch) => setCells((c) => ({ ...c, [key]: { subject: "", teacherId: "", ...c[key], ...patch } }));
  async function save() {
    setBusy(true); setMsg({ ok: "", error: "" });
    const slots = Object.entries(cells).filter(([, v]) => v.subject && v.subject.trim()).map(([k, v]) => { const [day, period] = k.split("-").map(Number); return { day, period, subject: v.subject, teacherId: v.teacherId || null }; });
    try { const r = await api.saveTimetable({ sectionId, slots }); setMsg({ ok: `Timetable saved (${r.saved} periods).`, error: "" }); }
    catch (e) { setMsg({ ok: "", error: e.message }); } finally { setBusy(false); }
  }

  if (sections.length === 0) return <div className="sta-empty">Create classes and sections first (Classes tab).</div>;
  return (
    <div className="sta-card">
      <span className="sta-label">Class and section</span>
      <select className="sta-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>{sections.map((s) => <option key={s.id} value={s.id}>{s.grade}-{s.name}</option>)}</select>
      {cells === null && !msg.error && <div className="sta-loading">Loading…</div>}
      {cells && (
        <>
          <div className="sta-scroll"><table className="sta-table" style={{ minWidth: 760 }}>
            <thead><tr><th>Period</th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
            <tbody>{PERIODS.map((p) => (
              <tr key={p}><td><b>{p}</b></td>{DAYS.map((d, i) => {
                const k = `${i + 1}-${p}`; const c = cells[k] || { subject: "", teacherId: "" };
                return <td key={k} style={{ minWidth: 100 }}>
                  <input className="sta-mini-input" style={{ width: "100%", marginBottom: 3 }} placeholder="Subject" value={c.subject} onChange={(e) => set(k, { subject: e.target.value })} />
                  <select className="sta-mini-input" style={{ width: "100%" }} value={c.teacherId} onChange={(e) => set(k, { teacherId: e.target.value })}>
                    <option value="">Teacher…</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select></td>;
              })}</tr>
            ))}</tbody></table></div>
          <button className="sta-btn" style={{ marginTop: 12 }} disabled={busy} onClick={save}>{busy ? "Saving..." : "Save timetable"}</button>
          <div className="sta-note">The same teacher cannot be put in two classes in the same period. The app will tell you if that happens. Clear a box to remove the period.</div>
        </>
      )}
      {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
      {msg.error && <div className="sta-error">{msg.error}</div>}
      <UploadBox type="timetable" onDone={() => setVer((v) => v + 1)} title="Upload the timetable of many classes from Excel" />
    </div>
  );
}

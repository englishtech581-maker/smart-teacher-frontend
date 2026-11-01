import React, { useState, useEffect } from "react";
import { api } from "./api";
import { MarksEntry, StudentPicker, ReportCardView, ActivitiesPanel } from "./Academics.jsx";

const MODES = [["exams", "Exams"], ["marks", "Enter marks"], ["cards", "Report cards"], ["activities", "Co-curricular"]];

export default function AdminExams() {
  const [mode, setMode] = useState("exams");
  const [sections, setSections] = useState([]);
  useEffect(() => { api.getSections().then(setSections).catch(() => {}); }, []);
  return (
    <div>
      <div className="sta-tabs sta-noprint">{MODES.map(([k, l]) => <button key={k} className={`sta-tab ${mode === k ? "active" : ""}`} onClick={() => setMode(k)}>{l}</button>)}</div>
      {mode === "exams" && <ExamList />}
      {mode === "marks" && (sections.length ? <MarksEntry sections={sections} /> : <div className="sta-empty">Create classes and sections first (Classes tab).</div>)}
      {mode === "cards" && <Cards />}
      {mode === "activities" && <Activities />}
    </div>
  );
}

function ExamList() {
  const [exams, setExams] = useState(null);
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [error, setError] = useState("");
  const load = () => api.listExams().then(setExams).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  async function add() {
    setError("");
    try { await api.createExam({ name, term }); setName(""); setTerm(""); load(); } catch (e) { setError(e.message); }
  }
  async function del(e) {
    if (!window.confirm(`Delete "${e.name}" and all its marks? This cannot be undone.`)) return;
    await api.deleteExam(e.id); load();
  }
  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 10 }}>Exams this year</h3>
      {exams === null && !error && <div className="sta-loading">Loading…</div>}
      {exams && exams.length === 0 && <div className="sta-empty">No exams yet. Add the first one below, for example Mid-term.</div>}
      {exams && exams.length > 0 && <table className="sta-table"><tbody>{exams.map((e) => (
        <tr key={e.id}><td><b>{e.name}</b> <span className="sta-small">{e.term || ""} {e.year}</span></td><td><button className="sta-linkbtn" onClick={() => del(e)}>Delete</button></td></tr>
      ))}</tbody></table>}
      <hr className="sta-divider" />
      <div className="sta-grid2">
        <div><span className="sta-label">Exam name *</span><input className="sta-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mid-term" /></div>
        <div><span className="sta-label">Term (optional)</span><input className="sta-input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Term 1" /></div>
      </div>
      <button className="sta-btn" disabled={!name.trim()} onClick={add}>Add exam</button>
      {error && <div className="sta-error">{error}</div>}
      <div className="sta-note">After creating an exam, teachers enter marks for their own classes. You can enter marks for any class in the Enter marks tab.</div>
    </div>
  );
}

function Cards() {
  const [student, setStudent] = useState(null);
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!student) return;
    setCard(null); setError("");
    api.reportCard(student.id).then(setCard).catch((e) => setError(e.message));
  }, [student]);
  return (
    <div>
      <StudentPicker onPick={setStudent} />
      {error && <div className="sta-error">{error}</div>}
      {student && !card && !error && <div className="sta-loading">Building the report card…</div>}
      {card && <ReportCardView card={card} />}
    </div>
  );
}

function Activities() {
  const [student, setStudent] = useState(null);
  return (
    <div>
      <StudentPicker onPick={setStudent} />
      {student && <><div className="sta-section-title">{student.name}</div><ActivitiesPanel studentId={student.id} /></>}
    </div>
  );
}

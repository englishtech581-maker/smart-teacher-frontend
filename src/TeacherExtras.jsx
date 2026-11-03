import React, { useState, useEffect } from "react";
import { api } from "./api";
import UploadBox from "./UploadBox.jsx";
import { MarksEntry, ActivitiesPanel } from "./Academics.jsx";
import { DAYS } from "./AdminTimetable.jsx";
import ResultsPanel from "./Results.jsx";

const todayStr = () => new Date().toISOString().slice(0, 10);

/* ---------- Marks and co-curricular for the selected class ---------- */
export function TeacherMarks({ klass }) {
  const [sections, setSections] = useState(null);
  const [students, setStudents] = useState([]);
  const [sid, setSid] = useState("");
  const [part, setPart] = useState("marks");
  useEffect(() => {
    api.getSections().then((s) => setSections(s.filter((x) => x.id === klass.section_id))).catch(() => setSections([]));
    api.listStudents(klass.id).then(setStudents).catch(() => {});
  }, [klass.id]);
  if (sections === null) return <div className="sta-loading">Loading…</div>;
  if (!klass.section_id || sections.length === 0) return <div className="sta-empty">This class is not linked to a section, so marks cannot be entered here. Create the class again and choose its section.</div>;
  return (
    <div>
      <div className="sta-row" style={{ marginBottom: 12 }}>
        <button className={`sta-btn small ${part === "marks" ? "" : "secondary"}`} onClick={() => setPart("marks")}>Exam marks</button>
        <button className={`sta-btn small ${part === "res" ? "" : "secondary"}`} onClick={() => setPart("res")}>Class result</button>
        <button className={`sta-btn small ${part === "act" ? "" : "secondary"}`} onClick={() => setPart("act")}>Co-curricular</button>
      </div>
      {part === "marks" && <MarksEntry sections={sections} defaultSubject={klass.subject} fixedSection />}
      {part === "res" && <ResultsPanel sections={sections} isAdmin={false} />}
      {part === "act" && (
        <>
          <div className="sta-card"><span className="sta-label">Student</span>
            <select className="sta-select" value={sid} onChange={(e) => setSid(e.target.value)}><option value="">Choose…</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          {sid && <ActivitiesPanel studentId={sid} canDelete />}
          <UploadBox type="activities" title="Upload co-curricular marks for the class from Excel" />
        </>
      )}
    </div>
  );
}

/* ---------- Homework ---------- */
export function TeacherHomework({ klass }) {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ title: "", details: "", dueDate: "" });
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const load = () => api.classHomework(klass.id).then(setList).catch((e) => setMsg({ ok: "", error: e.message }));
  useEffect(() => { setList(null); load(); }, [klass.id]);
  async function post() {
    setMsg({ ok: "", error: "" });
    try { await api.postHomework({ classId: klass.id, ...f }); setF({ title: "", details: "", dueDate: "" }); setMsg({ ok: "Homework posted. Parents can see it now.", error: "" }); load(); }
    catch (e) { setMsg({ ok: "", error: e.message }); }
  }
  return (
    <div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>Give homework to {klass.subject}, class {klass.grade}</h3>
        <span className="sta-label">What is the homework? *</span>
        <input className="sta-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Exercise 3.1, questions 1 to 5" />
        <span className="sta-label">Details (optional)</span>
        <textarea className="sta-textarea" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />
        <span className="sta-label">Hand in by</span>
        <input className="sta-input" type="date" min={todayStr()} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
        <button className="sta-btn" disabled={!f.title.trim()} onClick={post}>Post homework</button>
        {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
        {msg.error && <div className="sta-error">{msg.error}</div>}
      </div>
      <div className="sta-section-title">Given so far</div>
      {list === null && <div className="sta-loading">Loading…</div>}
      {list && list.length === 0 && <div className="sta-empty">No homework given yet.</div>}
      {list && list.map((h) => (
        <div className="sta-plan" key={h.id}>
          <div className="head"><b>{h.title}</b><span>{h.due_date ? `Due ${h.due_date}` : ""}</span></div>
          {h.details && <div className="sta-small" style={{ marginTop: 4 }}>{h.details}</div>}
          <div className="sta-small" style={{ marginTop: 4 }}>Given on {h.given_on} · <button className="sta-linkbtn" onClick={() => api.deleteHomework(h.id).then(load)}>Delete</button></div>
        </div>
      ))}
    </div>
  );
}

/* ---------- My week and my leave ---------- */
export function TeacherWeek() {
  const [slots, setSlots] = useState(null);
  const [leave, setLeave] = useState(null);
  const [f, setF] = useState({ fromDate: todayStr(), toDate: todayStr(), kind: "Casual", reason: "" });
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const loadLeave = () => api.myLeave().then(setLeave).catch(() => setLeave([]));
  useEffect(() => { api.myTimetable().then(setSlots).catch(() => setSlots([])); loadLeave(); }, []);
  async function ask() {
    setMsg({ ok: "", error: "" });
    try { await api.requestLeave(f); setMsg({ ok: "Request sent to the principal.", error: "" }); loadLeave(); } catch (e) { setMsg({ ok: "", error: e.message }); }
  }
  return (
    <div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>My timetable</h3>
        {slots === null && <div className="sta-loading">Loading…</div>}
        {slots && slots.length === 0 && <div className="sta-empty">The principal has not given you any periods yet.</div>}
        {slots && slots.length > 0 && DAYS.map((d, i) => {
          const day = slots.filter((s) => s.day === i + 1);
          return day.length ? <div key={d} style={{ marginBottom: 8 }}><b>{d}</b>{day.map((s) => <div key={s.period} className="sta-small">Period {s.period}: {s.subject}, class {s.grade}-{s.section}</div>)}</div> : null;
        })}
      </div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>Ask for leave</h3>
        <div className="sta-grid2">
          <div><span className="sta-label">From</span><input className="sta-input" type="date" value={f.fromDate} onChange={(e) => setF({ ...f, fromDate: e.target.value })} /></div>
          <div><span className="sta-label">To</span><input className="sta-input" type="date" value={f.toDate} onChange={(e) => setF({ ...f, toDate: e.target.value })} /></div>
          <div><span className="sta-label">Type</span><select className="sta-select" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{["Casual", "Sick", "Annual"].map((k) => <option key={k}>{k}</option>)}</select></div>
          <div><span className="sta-label">Reason</span><input className="sta-input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
        </div>
        <button className="sta-btn" onClick={ask}>Send request</button>
        {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
        {msg.error && <div className="sta-error">{msg.error}</div>}
        {leave && leave.length > 0 && <table className="sta-table" style={{ marginTop: 10 }}><tbody>{leave.map((l) => <tr key={l.id}><td>{l.from_date} to {l.to_date}<div className="sta-small">{l.kind}</div></td><td><span className={`sta-chip ${l.status === "approved" ? "chip-exc" : l.status === "rejected" ? "chip-risk" : "chip-good"}`}>{l.status}</span></td></tr>)}</tbody></table>}
      </div>
    </div>
  );
}

/* ---------- Ask the AI more about a lesson plan ---------- */
export function LessonChat({ klass, chapter, topic, language, bookId, guide }) {
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dir = language === "ur" ? "rtl" : "ltr";
  const ideas = ["Explain this topic more simply", "Give me 5 more questions", "Suggest a real-life example", "What mistakes do students usually make?"];
  async function ask(text) {
    const question = (text ?? q).trim();
    if (!question || busy) return;
    setBusy(true); setError(""); setQ("");
    const next = [...msgs, { role: "user", content: question }];
    setMsgs(next);
    try {
      const r = await api.lessonChat({ subject: klass.subject, klass: klass.grade, chapter, topic, language, bookId: bookId || undefined, guide, question, history: msgs });
      setMsgs([...next, { role: "ai", content: r.answer }]);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 4 }}>Ask more about this lesson</h3>
      <div className="sta-small" style={{ marginBottom: 10 }}>{bookId ? "The answers use your school's book." : "Ask anything about the plan above."}</div>
      {msgs.length === 0 && <div className="sta-ideas">{ideas.map((i) => <button key={i} className="sta-idea" onClick={() => ask(i)}>{i}</button>)}</div>}
      {msgs.map((m, i) => <div key={i} dir={dir} className={`sta-bubble ${m.role}`}>{m.content}</div>)}
      {busy && <div className="sta-loading">Thinking…</div>}
      <div className="sta-row" style={{ marginTop: 8 }}>
        <input className="sta-input" style={{ marginBottom: 0 }} dir={dir} value={q} placeholder="Type your question" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
        <button className="sta-btn small" style={{ flex: "0 0 auto" }} disabled={busy || !q.trim()} onClick={() => ask()}>Ask</button>
      </div>
      {error && <div className="sta-error">{error}</div>}
    </div>
  );
}

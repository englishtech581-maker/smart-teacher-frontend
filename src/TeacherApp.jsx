import React, { useState, useEffect, useMemo } from "react";
import { api } from "./api";
import { computePerformance, chipClass, suggestionFor, todayStr, monthKey } from "./logic";

export default function TeacherApp({ user, onLogout }) {
  const [classes, setClasses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("planner");

  useEffect(() => {
    api.listClasses().then((c) => { setClasses(c); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  return (
    <>
      <div className="sta-topbar">
        <div className="who">Teacher · <b>{user.name}</b></div>
        <button className="sta-logout" onClick={onLogout}>Log out</button>
      </div>

      {!selected ? (
        <ClassPicker
          classes={classes}
          loaded={loaded}
          onOpen={setSelected}
          onCreated={(c) => { setClasses([c, ...classes]); setSelected(c); }}
        />
      ) : (
        <>
          <div className="sta-card" style={{ padding: "10px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              {selected.subject} · Class {selected.grade}{selected.chapter ? ` · ${selected.chapter}` : ""}
            </div>
            <button className="sta-linkbtn" onClick={() => setSelected(null)}>Switch class</button>
          </div>

          <div className="sta-tabs">
            <button className={`sta-tab ${tab === "planner" ? "active" : ""}`} onClick={() => setTab("planner")}>📘 Lesson Planner</button>
            <button className={`sta-tab ${tab === "students" ? "active" : ""}`} onClick={() => setTab("students")}>📊 Performance</button>
            <button className={`sta-tab ${tab === "attendance" ? "active" : ""}`} onClick={() => setTab("attendance")}>🗓️ Attendance</button>
          </div>

          {tab === "planner" && <PlannerTab klass={selected} onUpdated={(patch) => setSelected({ ...selected, ...patch })} />}
          {tab === "students" && <StudentsTab klass={selected} />}
          {tab === "attendance" && <AttendanceTab klass={selected} />}
        </>
      )}
    </>
  );
}

function ClassPicker({ classes, loaded, onOpen, onCreated }) {
  const [showForm, setShowForm] = useState(classes.length === 0);
  const [form, setForm] = useState({ subject: "", grade: "", chapter: "", topic: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setSaving(true);
    setError("");
    try {
      const c = await api.createClass(form);
      onCreated(c);
    } catch (err) {
      setError(err.message || "Could not create class");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {classes.length > 0 && !showForm && (
        <>
          <div className="sta-section-title">Your classes</div>
          {classes.map((c) => (
            <div className="sta-card" key={c.id} style={{ cursor: "pointer" }} onClick={() => onOpen(c)}>
              <b>{c.subject}</b>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>Class {c.grade}{c.chapter ? ` · ${c.chapter}` : ""}</div>
            </div>
          ))}
          <button className="sta-linkbtn" onClick={() => setShowForm(true)}>+ Create a new class</button>
        </>
      )}
      {(showForm || (loaded && classes.length === 0)) && (
        <div className="sta-card">
          <span className="sta-label">Subject</span>
          <input className="sta-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" />
          <span className="sta-label">Class / Grade</span>
          <input className="sta-input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. 7" />
          <span className="sta-label">Chapter (optional)</span>
          <input className="sta-input" value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} placeholder="e.g. Algebra" />
          <span className="sta-label">Topic (optional)</span>
          <input className="sta-input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Linear Equations" />
          <button className="sta-btn" disabled={!form.subject.trim() || !form.grade.trim() || saving} onClick={create}>
            {saving ? "Creating..." : "Create class"}
          </button>
          {error && <div className="sta-error">{error}</div>}
          {classes.length > 0 && <button className="sta-linkbtn" style={{ marginTop: 10 }} onClick={() => setShowForm(false)}>Cancel</button>}
        </div>
      )}
    </>
  );
}

function PlannerTab({ klass, onUpdated }) {
  const [chapter, setChapter] = useState(klass.chapter || "");
  const [topic, setTopic] = useState(klass.topic || "");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guide, setGuide] = useState(null);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setGuide(null);
    try {
      const result = await api.lessonGuide({ subject: klass.subject, klass: klass.grade, chapter, topic, language });
      setGuide(result);
      api.updateClass(klass.id, { chapter, topic }).then(() => onUpdated({ chapter, topic })).catch(() => {});
    } catch (err) {
      setError(err.message || "Could not generate the guide. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="sta-card">
        <span className="sta-label">Chapter</span>
        <input className="sta-input" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Algebra" />
        <span className="sta-label">Topic to teach today</span>
        <input className="sta-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Linear Equations" />
        <span className="sta-label">Guide language</span>
        <div className="sta-row" style={{ marginBottom: 12 }}>
          <button className={`sta-btn small ${language === "en" ? "" : "secondary"}`} onClick={() => setLanguage("en")}>English</button>
          <button className={`sta-btn small ${language === "ur" ? "" : "secondary"}`} onClick={() => setLanguage("ur")}>اردو</button>
        </div>
        <button className="sta-btn" onClick={handleGenerate} disabled={!topic.trim() || loading}>
          {loading ? "Preparing guide..." : "Generate Teaching Guide"}
        </button>
        {error && <div className="sta-error">{error}</div>}
      </div>
      {loading && <div className="sta-loading">Building lesson objectives, activities and assessment…</div>}
      {guide && <LessonGuideView guide={guide} rtl={language === "ur"} />}
    </div>
  );
}

function LessonGuideView({ guide, rtl }) {
  const dir = rtl ? "rtl" : "ltr";
  const Section = ({ title, children }) => (<><div className="sta-section-title">{title}</div>{children}</>);
  const List = ({ items }) => (<ul className="sta-list" dir={dir}>{(items || []).map((it, i) => <li key={i}>{it}</li>)}</ul>);
  return (
    <div className="sta-card" dir={dir}>
      <Section title="Learning Objectives"><List items={guide.objectives} /></Section>
      <Section title="Lesson Introduction"><p style={{ fontSize: 14.5, lineHeight: 1.6 }}>{guide.introduction}</p></Section>
      <Section title="Simple Explanation"><p style={{ fontSize: 14.5, lineHeight: 1.6 }}>{guide.explanation}</p></Section>
      <Section title="Examples"><List items={guide.examples} /></Section>
      <Section title="Classroom Activities"><List items={guide.activities} /></Section>
      <Section title="Questions to Ask Students"><List items={guide.questions} /></Section>
      <Section title="For Weak Students"><List items={guide.weakStudentActivities} /></Section>
      <Section title="For Advanced Students"><List items={guide.advancedQuestions} /></Section>
      <Section title="5-Minute Assessment"><List items={guide.assessment} /></Section>
      <Section title="Homework"><List items={guide.homework} /></Section>
      <Section title="Next Lesson Suggestion"><p style={{ fontSize: 14.5, lineHeight: 1.6 }}>{guide.nextLesson}</p></Section>
    </div>
  );
}

function StudentsTab({ klass }) {
  const [students, setStudents] = useState([]);
  const [latest, setLatest] = useState({});
  const [monthly, setMonthly] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: "", parentEmail: "" });
  const [drafts, setDrafts] = useState({});
  const [insights, setInsights] = useState({});

  async function refresh() {
    const [s, perf, monthlyRows] = await Promise.all([
      api.listStudents(klass.id),
      api.getLatestPerformance(klass.id),
      api.getMonthlyAttendance(klass.id, monthKey(todayStr())),
    ]);
    setStudents(s);
    const perfMap = {};
    perf.forEach((p) => (perfMap[p.student_id] = p));
    setLatest(perfMap);
    const mMap = {};
    monthlyRows.forEach((r) => (mMap[r.student_id] = r));
    setMonthly(mMap);
    setLoaded(true);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [klass.id]);

  async function addStudent() {
    if (!form.name.trim()) return;
    await api.addStudent(klass.id, { name: form.name.trim(), parentEmail: form.parentEmail.trim() || undefined });
    setForm({ name: "", parentEmail: "" });
    refresh();
  }
  async function removeStudent(id) {
    await api.removeStudent(klass.id, id);
    refresh();
  }
  function draftFor(s) {
    return drafts[s.id] || {
      quiz: latest[s.id]?.quiz_score ?? "",
      quizMax: latest[s.id]?.quiz_max ?? "10",
      homework: latest[s.id]?.homework_status || "Average",
    };
  }
  async function savePerformance(s) {
    const d = draftFor(s);
    await api.addPerformance(klass.id, {
      studentId: s.id,
      quizScore: Number(d.quiz) || 0,
      quizMax: Number(d.quizMax) || 10,
      homeworkStatus: d.homework,
      topic: klass.topic,
    });
    setDrafts((prev) => { const n = { ...prev }; delete n[s.id]; return n; });
    refresh();
  }
  async function getInsight(s) {
    setInsights((prev) => ({ ...prev, [s.id]: { loading: true } }));
    try {
      const data = await api.studentInsight({ classId: klass.id, studentId: s.id, language: "en" });
      setInsights((prev) => ({ ...prev, [s.id]: { data } }));
    } catch {
      setInsights((prev) => ({ ...prev, [s.id]: { error: true } }));
    }
  }

  return (
    <div>
      <div className="sta-card">
        <span className="sta-label">Add a student</span>
        <input className="sta-input" placeholder="Student name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <span className="sta-label">Parent's email (optional — lets them log in and see reports)</span>
        <input className="sta-input" placeholder="parent@email.com" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} />
        <button className="sta-btn" onClick={addStudent}>Add Student</button>
      </div>

      {loaded && students.length === 0 && <div className="sta-empty">No students added yet for this class.</div>}

      {students.map((s) => {
        const d = draftFor(s);
        const quizPct = Number(d.quizMax) > 0 ? (Number(d.quiz || 0) / Number(d.quizMax)) * 100 : 0;
        const m = monthly[s.id];
        const attPct = m && Number(m.total) > 0 ? ((Number(m.present) + Number(m.late) * 0.5) / Number(m.total)) * 100 : 100;
        const perf = computePerformance(quizPct, d.homework, attPct);
        const suggestion = suggestionFor(perf, klass.topic);
        const isDirty = !!drafts[s.id];
        return (
          <div className="sta-card" key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 15 }}>{s.name}</b>
              <span className={`sta-chip ${chipClass(perf)}`}>{perf}</span>
            </div>
            <div className="sta-row" style={{ marginTop: 10 }}>
              <div>
                <span className="sta-label">Quiz</span>
                <div className="sta-row">
                  <input className="sta-mini-input" value={d.quiz} onChange={(e) => setDrafts({ ...drafts, [s.id]: { ...d, quiz: e.target.value } })} />
                  <span style={{ alignSelf: "center", fontSize: 13, color: "var(--ink-soft)" }}>/ {d.quizMax}</span>
                </div>
              </div>
              <div>
                <span className="sta-label">Homework</span>
                <select className="sta-select" style={{ marginBottom: 0 }} value={d.homework} onChange={(e) => setDrafts({ ...drafts, [s.id]: { ...d, homework: e.target.value } })}>
                  <option>Good</option><option>Average</option><option>Weak</option><option>Missing</option>
                </select>
              </div>
            </div>
            {isDirty && <button className="sta-btn small" style={{ marginTop: 8 }} onClick={() => savePerformance(s)}>Save score</button>}
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 8 }}>Attendance (this month): {m ? Math.round(attPct) : "—"}%</div>
            {suggestion && <div className="sta-suggest">💡 {suggestion}</div>}
            {(perf === "At Risk" || perf === "Needs Support") && (
              <>
                {!insights[s.id]?.data && (
                  <button className="sta-linkbtn" style={{ marginTop: 10, display: "block" }} onClick={() => getInsight(s)} disabled={insights[s.id]?.loading}>
                    {insights[s.id]?.loading ? "Thinking..." : "🔍 Get AI early-warning insight"}
                  </button>
                )}
                {insights[s.id]?.error && <div className="sta-note" style={{ color: "var(--maroon)" }}>Could not get an insight right now.</div>}
                {insights[s.id]?.data && (
                  <div className="sta-suggest" style={{ marginTop: 8, background: "var(--paper-2)", borderLeftColor: "var(--ink-soft)", color: "var(--ink)" }}>
                    <b style={{ fontSize: 13 }}>Likely cause:</b> {insights[s.id].data.likelyCause}
                    <ul className="sta-list" style={{ marginTop: 6, fontSize: 13 }}>{(insights[s.id].data.actions || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
                    <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--ink-soft)" }}>Watch for: {insights[s.id].data.watchFor}</div>
                  </div>
                )}
              </>
            )}
            <button className="sta-linkbtn" style={{ marginTop: 10 }} onClick={() => removeStudent(s.id)}>Remove student</button>
          </div>
        );
      })}
    </div>
  );
}

function AttendanceTab({ klass }) {
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(todayStr());
  const [dayRecord, setDayRecord] = useState({});
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  async function loadDay(d) {
    const rows = await api.getDayAttendance(klass.id, d);
    const map = {};
    rows.forEach((r) => (map[r.student_id] = r.status));
    setDayRecord(map);
  }
  async function loadMonthly() {
    const rows = await api.getMonthlyAttendance(klass.id, monthKey(date));
    setMonthlyRows(rows);
  }
  useEffect(() => {
    (async () => {
      const s = await api.listStudents(klass.id);
      setStudents(s);
      await loadDay(date);
      await loadMonthly();
      setLoaded(true);
    })();
    // eslint-disable-next-line
  }, [klass.id]);
  useEffect(() => { if (loaded) { loadDay(date); loadMonthly(); } /* eslint-disable-next-line */ }, [date]);

  async function setStatus(studentId, status) {
    setDayRecord((prev) => ({ ...prev, [studentId]: status }));
    await api.markAttendance(klass.id, { date, records: [{ studentId, status }] });
    loadMonthly();
  }

  const presentCount = Object.values(dayRecord).filter((v) => v === "present").length;
  const markedCount = Object.values(dayRecord).length;
  const dayPct = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : null;

  const lowAttendance = monthlyRows.filter((r) => r.pct !== null && r.pct < 75);

  if (loaded && students.length === 0) {
    return <div className="sta-empty">Add students in the Performance tab first, then take attendance here.</div>;
  }

  return (
    <div>
      <div className="sta-card">
        <span className="sta-label">Date</span>
        <input type="date" className="sta-input" value={date} onChange={(e) => setDate(e.target.value)} />
        {students.map((s) => {
          const status = dayRecord[s.id];
          return (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--rule)" }}>
              <span style={{ fontSize: 14.5 }}>{s.name}</span>
              <div className="sta-row" style={{ maxWidth: 150, gap: 6 }}>
                <button className={`sta-status-btn ${status === "present" ? "on" : ""}`} onClick={() => setStatus(s.id, "present")}>🟢</button>
                <button className={`sta-status-btn ${status === "late" ? "on" : ""}`} onClick={() => setStatus(s.id, "late")}>🟡</button>
                <button className={`sta-status-btn ${status === "absent" ? "on" : ""}`} onClick={() => setStatus(s.id, "absent")}>🔴</button>
              </div>
            </div>
          );
        })}
        {dayPct !== null && <div className="sta-note">Today's attendance: {dayPct}% ({presentCount}/{markedCount} marked present)</div>}
      </div>

      <div className="sta-section-title">Monthly Attendance ({monthKey(date)})</div>
      <div className="sta-card">
        <table className="sta-table">
          <thead><tr><th>Student</th><th>Present</th><th>Late</th><th>%</th></tr></thead>
          <tbody>
            {monthlyRows.map((r) => (
              <tr key={r.student_id}>
                <td>{r.name}</td><td>{r.present}</td><td>{r.late}</td><td>{r.pct === null ? "—" : `${r.pct}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lowAttendance.length > 0 && (
        <>
          <div className="sta-section-title">Low Attendance — Needs a Parent Note</div>
          {lowAttendance.map((r) => (
            <div className="sta-card" key={r.student_id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b>{r.name}</b>
                <span className="sta-chip chip-risk">{r.pct}%</span>
              </div>
              <textarea
                className="sta-textarea"
                style={{ marginTop: 10 }}
                readOnly
                value={`Dear Parent, this is to inform you that ${r.name}'s attendance this month is ${r.pct}%, which is below the required 75%. Please encourage regular attendance and contact the school if there is a reason we should know about.`}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { api } from "./api";
import { ReportCardView } from "./Academics.jsx";

const Tile = ({ n, l, warn }) => <div className="sta-stat"><div className="num" style={warn ? { color: "var(--maroon)" } : undefined}>{n ?? "-"}</div><div className="lbl">{l}</div></div>;
const pctText = (v) => (v === null || v === undefined ? "-" : `${v}%`);

// Results for a class or the whole school, and every report card of a class ready to print.
export default function ResultsPanel({ sections, isAdmin }) {
  const [exams, setExams] = useState(null);
  const [examId, setExamId] = useState("annual");
  const [sectionId, setSectionId] = useState(sections[0] ? sections[0].id : "");
  const [mode, setMode] = useState("class");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.listExams().then(setExams).catch((e) => setError(e.message)); }, []);
  useEffect(() => { setData(null); setError(""); }, [mode, examId, sectionId]);

  async function show() {
    setBusy(true); setError(""); setData(null);
    try {
      setData({ mode, value: mode === "school" ? await api.schoolResults(examId) : mode === "cards" ? await api.reportCards(sectionId) : await api.classResults(examId, sectionId) });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const modes = [["class", "Class result"], ...(isAdmin ? [["school", "Whole school"]] : []), ["cards", "All report cards"]];
  return (
    <div>
      <div className="sta-card sta-noprint">
        <div className="sta-row" style={{ marginBottom: 12 }}>
          {modes.map(([k, l]) => <button key={k} className={`sta-btn small ${mode === k ? "" : "secondary"}`} onClick={() => setMode(k)}>{l}</button>)}
        </div>
        <div className="sta-grid2">
          {mode !== "cards" && (
            <div><span className="sta-label">Exam</span>
              <select className="sta-select" value={examId} onChange={(e) => setExamId(e.target.value)}>
                <option value="annual">Whole year (all exams together)</option>
                {(exams || []).map((e) => <option key={e.id} value={e.id}>{e.name} {e.year}</option>)}
              </select></div>
          )}
          {mode !== "school" && (
            <div><span className="sta-label">Class and section</span>
              <select className="sta-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.grade}-{s.name}</option>)}
              </select></div>
          )}
        </div>
        <button className="sta-btn" disabled={busy || (mode !== "school" && !sectionId)} onClick={show}>{busy ? "Working…" : mode === "cards" ? "Make the report cards" : "Show the result"}</button>
        {error && <div className="sta-error">{error}</div>}
      </div>

      {data && data.mode === "class" && <ClassResult r={data.value} />}
      {data && data.mode === "school" && <SchoolResult r={data.value} />}
      {data && data.mode === "cards" && (
        <div className="sta-batch">
          {data.value.length === 0 && <div className="sta-empty">No students in this class.</div>}
          {data.value.length > 0 && <button className="sta-btn sta-noprint" style={{ marginBottom: 12 }} onClick={() => window.print()}>Print all {data.value.length} report cards (one per page)</button>}
          {data.value.map((c) => <ReportCardView key={c.student.id} card={c} />)}
        </div>
      )}
    </div>
  );
}

function ClassResult({ r }) {
  const s = r.summary;
  return (
    <div className="sta-printarea">
      <div className="sta-card">
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 19, fontWeight: 700 }}>Result of class {r.section.grade}-{r.section.name}</div>
          <div className="sta-small">{r.exam} · {r.year} · pass mark {r.passMark}% in every subject</div>
        </div>
        <div className="sta-stat-grid">
          <Tile n={`${s.appeared} of ${s.students}`} l="Students with marks" />
          <Tile n={pctText(s.passPct)} l={`Passed (${s.passed}) · failed (${s.failed})`} />
          <Tile n={pctText(s.avgPct)} l="Class average" />
          <Tile n={s.toppers.length ? `${s.toppers[0]}${s.toppers.length > 1 ? ` +${s.toppers.length - 1}` : ""}` : "-"} l={`Topper${s.highest ? ` (${s.highest}%)` : ""}`} />
        </div>
        {s.appeared === 0 ? <div className="sta-empty">No marks have been entered for this exam and class yet.</div> : (
          <div className="sta-scroll" style={{ marginTop: 12 }}>
            <table className="sta-table">
              <thead><tr><th>Pos.</th><th>Student</th>{r.subjects.map((x) => <th key={x}>{x}</th>)}<th>Total</th><th>%</th><th>Grade</th><th>Result</th></tr></thead>
              <tbody>{r.rows.map((x) => (
                <tr key={x.id}>
                  <td><b>{x.position ?? "-"}</b></td>
                  <td>{x.name}<div className="sta-small">{x.admissionNo || ""}</div></td>
                  {r.subjects.map((sub) => { const v = x.subjects[sub]; return <td key={sub} style={v && v.pct < r.passMark ? { color: "var(--maroon)", fontWeight: 600 } : undefined}>{v ? `${v.marks}/${v.total}` : "-"}</td>; })}
                  <td>{x.pct === null ? "-" : `${x.got}/${x.max}`}</td><td>{pctText(x.pct)}</td><td><b>{x.grade}</b></td>
                  <td style={{ color: x.result === "Fail" ? "var(--maroon)" : x.result === "Pass" ? "var(--sage)" : undefined, fontWeight: 600 }}>{x.result}{x.failed.length ? <div className="sta-small">{x.failed.join(", ")}</div> : null}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
        {r.subjectStats.length > 0 && (
          <>
            <div className="sta-section-title">Subject by subject</div>
            <table className="sta-table"><thead><tr><th>Subject</th><th>Average</th><th>Highest</th><th>Passed</th></tr></thead>
              <tbody>{r.subjectStats.map((x) => <tr key={x.subject}><td>{x.subject}</td><td>{pctText(x.avg)}</td><td>{pctText(x.highest)}</td><td>{pctText(x.passPct)}</td></tr>)}</tbody></table>
          </>
        )}
        <button className="sta-btn secondary sta-noprint" style={{ marginTop: 14 }} onClick={() => window.print()}>Print this result</button>
      </div>
    </div>
  );
}

function SchoolResult({ r }) {
  const s = r.summary;
  const grades = ["A+", "A", "B", "C", "D", "E", "F"].filter((g) => r.gradeDistribution[g]);
  return (
    <div className="sta-printarea">
      <div className="sta-card">
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 19, fontWeight: 700 }}>Whole school result</div>
          <div className="sta-small">{r.exam || "Whole year"} · pass mark {r.passMark}% in every subject</div>
        </div>
        <div className="sta-stat-grid">
          <Tile n={`${s.appeared} of ${s.students}`} l="Students with marks" />
          <Tile n={pctText(s.passPct)} l={`Passed (${s.passed}) · failed (${s.failed})`} />
          <Tile n={pctText(s.avgPct)} l="School average" />
          <Tile n={s.bestClass || "-"} l="Best class (by average)" />
        </div>
        <div className="sta-section-title">Class by class</div>
        <div className="sta-scroll"><table className="sta-table">
          <thead><tr><th>Class</th><th>Students</th><th>With marks</th><th>Average</th><th>Passed</th><th>Topper</th></tr></thead>
          <tbody>{r.classes.map((c) => <tr key={c.sectionId}><td><b>{c.name}</b></td><td>{c.students}</td><td>{c.appeared}</td><td>{pctText(c.avgPct)}</td><td>{pctText(c.passPct)}</td><td>{c.topper ? `${c.topper.name} (${c.topper.pct}%)` : "-"}</td></tr>)}</tbody></table></div>
        {r.topStudents.length > 0 && (
          <>
            <div className="sta-section-title">Top students of the school</div>
            <table className="sta-table"><tbody>{r.topStudents.map((t, i) => <tr key={i}><td><b>{i + 1}</b></td><td>{t.name}<div className="sta-small">Class {t.cls}</div></td><td>{t.pct}%</td><td><b>{t.grade}</b></td></tr>)}</tbody></table>
          </>
        )}
        {r.subjectAverages.length > 0 && (
          <>
            <div className="sta-section-title">Subject averages</div>
            <table className="sta-table"><tbody>{r.subjectAverages.map((x) => <tr key={x.subject}><td>{x.subject}</td><td>{pctText(x.avg)}</td></tr>)}</tbody></table>
          </>
        )}
        {grades.length > 0 && <div className="sta-small" style={{ marginTop: 10 }}>Grades given: {grades.map((g) => `${g}: ${r.gradeDistribution[g]}`).join(" · ")}</div>}
        <button className="sta-btn secondary sta-noprint" style={{ marginTop: 14 }} onClick={() => window.print()}>Print this result</button>
      </div>
    </div>
  );
}

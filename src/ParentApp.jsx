import React, { useState, useEffect } from "react";
import { api } from "./api";
import { chipClass } from "./logic";

export default function ParentApp({ user, onLogout }) {
  const [children, setChildren] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getChildren()
      .then(setChildren)
      .catch((err) => setError(err.message || "Could not load your children"));
  }, []);

  return (
    <>
      <div className="sta-topbar">
        <div className="who">Parent · <b>{user.name}</b></div>
        <button className="sta-logout" onClick={onLogout}>Log out</button>
      </div>

      {!selected && (
        <>
          {error && <div className="sta-error">{error}</div>}
          {children === null && !error && <div className="sta-loading">Loading…</div>}
          {children && children.length === 0 && (
            <div className="sta-empty">
              No children linked to this email yet. Ask your child's teacher to add your email
              address ({user.email}) as the parent email when they add your child.
            </div>
          )}
          {children && children.length > 0 && (
            <>
              <div className="sta-section-title">Your children</div>
              {children.map((c) => (
                <div className="sta-card" key={c.id} style={{ cursor: "pointer" }} onClick={() => setSelected(c)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b>{c.name}</b>
                    {c.latestPerformance && (
                      <span className={`sta-chip ${chipClass(performanceLabel(c))}`}>{performanceLabel(c)}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{c.subject} · Class {c.grade}</div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {selected && <ChildReport child={selected} onBack={() => setSelected(null)} />}
    </>
  );
}

function performanceLabel(c) {
  const p = c.latestPerformance;
  if (!p || !p.quiz_max) return "Good";
  const pct = (Number(p.quiz_score) / Number(p.quiz_max)) * 100;
  if (pct >= 80) return "Excellent";
  if (pct >= 60) return "Good";
  if (pct >= 40) return "Needs Support";
  return "At Risk";
}

function ChildReport({ child, onBack }) {
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  async function getReport() {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const result = await api.parentReport({ studentId: child.id, language });
      setReport(result);
    } catch (err) {
      setError(err.message || "Could not generate the report right now.");
    } finally {
      setLoading(false);
    }
  }

  const dir = language === "ur" ? "rtl" : "ltr";
  const p = child.latestPerformance;
  const quizPct = p && p.quiz_max > 0 ? Math.round((Number(p.quiz_score) / Number(p.quiz_max)) * 100) : null;

  return (
    <>
      <button className="sta-linkbtn" style={{ marginBottom: 12 }} onClick={onBack}>← Back to children</button>
      <div className="sta-card">
        <b style={{ fontSize: 16 }}>{child.name}</b>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{child.subject} · Class {child.grade}</div>
        <div className="sta-stat-grid" style={{ marginTop: 14 }}>
          <div className="sta-stat"><div className="num">{quizPct === null ? "—" : `${quizPct}%`}</div><div className="lbl">Latest Quiz</div></div>
          <div className="sta-stat"><div className="num">{child.attendancePct === null ? "—" : `${child.attendancePct}%`}</div><div className="lbl">Attendance</div></div>
          <div className="sta-stat"><div className="num">{p ? p.homework_status : "—"}</div><div className="lbl">Homework</div></div>
          <div className="sta-stat"><div className="num">{performanceLabel(child)}</div><div className="lbl">Overall</div></div>
        </div>
      </div>

      <div className="sta-card">
        <span className="sta-label">Report language</span>
        <div className="sta-row" style={{ marginBottom: 12 }}>
          <button className={`sta-btn small ${language === "en" ? "" : "secondary"}`} onClick={() => setLanguage("en")}>English</button>
          <button className={`sta-btn small ${language === "ur" ? "" : "secondary"}`} onClick={() => setLanguage("ur")}>اردو</button>
        </div>
        <button className="sta-btn" onClick={getReport} disabled={loading}>
          {loading ? "Writing report..." : "✨ Get plain-language report"}
        </button>
        {error && <div className="sta-error">{error}</div>}
      </div>

      {loading && <div className="sta-loading">Writing a report in plain, parent-friendly language…</div>}

      {report && (
        <div className="sta-card" dir={dir}>
          <div className="sta-section-title">Summary</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6 }}>{report.summary}</p>
          <div className="sta-section-title">Doing well</div>
          <ul className="sta-list" dir={dir}>{(report.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="sta-section-title">Could improve</div>
          <ul className="sta-list" dir={dir}>{(report.areasToImprove || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          <div className="sta-section-title">How you can help at home</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6 }}>{report.homeSupportTip}</p>
        </div>
      )}
    </>
  );
}

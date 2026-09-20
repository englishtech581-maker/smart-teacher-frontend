import React, { useState, useEffect } from "react";
import { api } from "./api";

export default function AdminApp({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [classes, setClasses] = useState([]);
  const [briefing, setBriefing] = useState({ loading: false, text: "", error: "", language: "en" });

  useEffect(() => {
    api.getDashboard().then(setStats).catch(() => setStats({}));
    api.listClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  async function getBriefing() {
    setBriefing((b) => ({ ...b, loading: true, error: "" }));
    try {
      const result = await api.riskBriefing({ language: briefing.language });
      setBriefing((b) => ({ ...b, loading: false, text: result.briefing }));
    } catch (err) {
      setBriefing((b) => ({ ...b, loading: false, error: err.message || "Could not generate the briefing" }));
    }
  }

  return (
    <>
      <div className="sta-topbar">
        <div className="who">Admin · <b>{user.name}</b></div>
        <button className="sta-logout" onClick={onLogout}>Log out</button>
      </div>
      <h2 style={{ marginBottom: 14 }}>Institute Dashboard</h2>

      <div className="sta-card">
        <span className="sta-label">Your School ID — share with teachers &amp; parents to join</span>
        <div className="sta-schoolid">{user.schoolId || user.school_id}</div>
      </div>

      {stats && (
        <div className="sta-stat-grid">
          <div className="sta-stat"><div className="num">{stats.totalStudents ?? "—"}</div><div className="lbl">Total Students</div></div>
          <div className="sta-stat"><div className="num">{stats.classCount ?? "—"}</div><div className="lbl">Classes</div></div>
          <div className="sta-stat"><div className="num">{stats.todayAttendancePct === null || stats.todayAttendancePct === undefined ? "—" : `${stats.todayAttendancePct}%`}</div><div className="lbl">Today's Attendance</div></div>
          <div className="sta-stat"><div className="num">{stats.needingSupport ?? "—"}</div><div className="lbl">Students Needing Support</div></div>
          <div className="sta-stat"><div className="num">{stats.pendingHomework ?? "—"}</div><div className="lbl">Pending Homework</div></div>
          <div className="sta-stat"><div className="num">{stats.avgQuizPct === null || stats.avgQuizPct === undefined ? "—" : `${stats.avgQuizPct}%`}</div><div className="lbl">Avg. Quiz Performance</div></div>
        </div>
      )}

      {stats && stats.needingSupport > 0 && (
        <div className="sta-card">
          <div className="sta-label">AI weekly risk briefing</div>
          <div className="sta-row" style={{ marginBottom: 12 }}>
            <button className={`sta-btn small ${briefing.language === "en" ? "" : "secondary"}`} onClick={() => setBriefing((b) => ({ ...b, language: "en" }))}>English</button>
            <button className={`sta-btn small ${briefing.language === "ur" ? "" : "secondary"}`} onClick={() => setBriefing((b) => ({ ...b, language: "ur" }))}>اردو</button>
          </div>
          <button className="sta-btn" onClick={getBriefing} disabled={briefing.loading}>
            {briefing.loading ? "Preparing briefing..." : "🧭 Generate AI Risk Briefing"}
          </button>
          {briefing.error && <div className="sta-error">{briefing.error}</div>}
          {briefing.text && <p style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 12 }} dir={briefing.language === "ur" ? "rtl" : "ltr"}>{briefing.text}</p>}
        </div>
      )}

      <div className="sta-section-title">Classes</div>
      {classes.length === 0 ? (
        <div className="sta-empty">Once teachers create classes, they'll appear here.</div>
      ) : (
        classes.map((c) => (
          <div className="sta-card" key={c.id}>
            <b>{c.subject}</b>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>Class {c.grade}</div>
          </div>
        ))
      )}
    </>
  );
}

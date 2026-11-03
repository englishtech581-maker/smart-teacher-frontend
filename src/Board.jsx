import React, { useState, useEffect } from "react";
import { api } from "./api";
import UploadBox from "./UploadBox.jsx";

const KINDS = { holiday: ["Holiday", "#8B3A3A"], exam: ["Exam", "#B9822A"], activity: ["Activity", "#5E8B73"], meeting: ["Meeting", "#365C52"], other: ["Other", "#8A9691"] };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const AUD = { all: "Everyone", teachers: "Teachers only", parents: "Parents only" };
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const nice = (a, b) => { const f = (s) => { const [, m, d] = s.split("-"); return `${Number(d)} ${MONTHS[Number(m) - 1].slice(0, 3)}`; }; return a === b ? f(a) : `${f(a)} to ${f(b)}`; };

// Notices and the school calendar. Everyone reads them; only the principal can add or remove.
export default function SchoolBoard({ canEdit }) {
  const [mode, setMode] = useState("notices");
  return (
    <div>
      <div className="sta-tabs sta-noprint">
        <button className={`sta-tab ${mode === "notices" ? "active" : ""}`} onClick={() => setMode("notices")}>Notices</button>
        <button className={`sta-tab ${mode === "calendar" ? "active" : ""}`} onClick={() => setMode("calendar")}>Calendar</button>
      </div>
      {mode === "notices" ? <Notices canEdit={canEdit} /> : <CalendarView canEdit={canEdit} />}
    </div>
  );
}

function Notices({ canEdit }) {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ title: "", body: "", audience: "all", pinned: false });
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const load = () => api.announcements().then(setList).catch((e) => setMsg({ ok: "", error: e.message }));
  useEffect(() => { load(); }, []);
  async function post() {
    setMsg({ ok: "", error: "" });
    try { await api.postAnnouncement(f); setF({ title: "", body: "", audience: "all", pinned: false }); setMsg({ ok: "Notice posted.", error: "" }); load(); } catch (e) { setMsg({ ok: "", error: e.message }); }
  }
  return (
    <div>
      {canEdit && (
        <div className="sta-card">
          <h3 style={{ marginBottom: 10 }}>Post a notice</h3>
          <span className="sta-label">Title *</span>
          <input className="sta-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Parent-teacher meeting on Friday" />
          <span className="sta-label">Details</span>
          <textarea className="sta-textarea" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
          <div className="sta-grid2">
            <div><span className="sta-label">Who should see it</span>
              <select className="sta-select" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginTop: 22 }}><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> Keep at the top</label>
          </div>
          <button className="sta-btn" disabled={!f.title.trim()} onClick={post}>Post notice</button>
          {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
          {msg.error && <div className="sta-error">{msg.error}</div>}
        </div>
      )}
      {list === null && !msg.error && <div className="sta-loading">Loading…</div>}
      {list && list.length === 0 && <div className="sta-empty">No notices yet.</div>}
      {list && list.map((n) => (
        <div className="sta-plan" key={n.id}>
          <div className="head"><b>{n.pinned ? "📌 " : ""}{n.title}</b><span>{n.posted_on}</span></div>
          {n.body && <div style={{ fontSize: 14, marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{n.body}</div>}
          <div className="sta-small" style={{ marginTop: 6 }}>
            {n.audience !== "all" ? <span className="sta-chip chip-good" style={{ marginRight: 8 }}>{AUD[n.audience]}</span> : null}
            {canEdit && <><button className="sta-linkbtn" onClick={() => api.pinAnnouncement(n.id, !n.pinned).then(load)}>{n.pinned ? "Unpin" : "Pin"}</button> · <button className="sta-linkbtn" onClick={() => window.confirm("Delete this notice?") && api.deleteAnnouncement(n.id).then(load)}>Delete</button></>}
          </div>
        </div>
      ))}
      {canEdit && <UploadBox type="announcements" onDone={load} title="Upload notices from Excel" />}
    </div>
  );
}

function CalendarView({ canEdit }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState("month");
  const [events, setEvents] = useState(null);
  const [f, setF] = useState({ title: "", kind: "activity", startDate: "", endDate: "", details: "" });
  const [error, setError] = useState("");
  const load = () => api.calendar(year).then(setEvents).catch((e) => setError(e.message));
  useEffect(() => { setEvents(null); load(); }, [year]);

  async function add() {
    setError("");
    try { await api.addEvent(f); setF({ ...f, title: "", details: "" }); load(); } catch (e) { setError(e.message); }
  }
  const step = (d) => { let m = month + d, y = year; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setMonth(m); setYear(y); };

  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // week starts on Monday
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const on = (d) => (events || []).filter((e) => e.start_date <= ymd(year, month, d) && e.end_date >= ymd(year, month, d));
  const inMonth = (events || []).filter((e) => e.start_date <= ymd(year, month, days) && e.end_date >= ymd(year, month, 1));

  const EventRow = ({ e }) => (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: KINDS[e.kind][1], marginTop: 5, flex: "0 0 auto" }} />
      <div style={{ flex: 1 }}><b>{e.title}</b> <span className="sta-small">{KINDS[e.kind][0]}</span>
        <div className="sta-small">{nice(e.start_date, e.end_date)}{e.details ? ` · ${e.details}` : ""}</div></div>
      {canEdit && <button className="sta-linkbtn" onClick={() => window.confirm("Delete this event?") && api.deleteEvent(e.id).then(load)}>Delete</button>}
    </div>
  );

  return (
    <div>
      <div className="sta-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <button className="sta-btn small secondary" onClick={() => (view === "month" ? step(-1) : setYear(year - 1))}>‹</button>
          <b style={{ fontFamily: "Georgia,serif", fontSize: 17 }}>{view === "month" ? `${MONTHS[month]} ${year}` : `Year ${year}`}</b>
          <button className="sta-btn small secondary" onClick={() => (view === "month" ? step(1) : setYear(year + 1))}>›</button>
        </div>
        <div className="sta-row" style={{ marginBottom: 10 }}>
          <button className={`sta-btn small ${view === "month" ? "" : "secondary"}`} onClick={() => setView("month")}>Month</button>
          <button className={`sta-btn small ${view === "year" ? "" : "secondary"}`} onClick={() => setView("year")}>Whole year</button>
        </div>
        {events === null && !error && <div className="sta-loading">Loading…</div>}
        {error && <div className="sta-error">{error}</div>}

        {events && view === "month" && (
          <>
            <div className="sta-cal">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="sta-cal-h">{d}</div>)}
              {cells.map((d, i) => d === null ? <div key={i} /> : (
                <div key={i} className={`sta-cal-d ${on(d).length ? "has" : ""}`}>
                  <div>{d}</div>
                  <div style={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>{on(d).slice(0, 3).map((e) => <span key={e.id} style={{ width: 6, height: 6, borderRadius: 3, background: KINDS[e.kind][1] }} />)}</div>
                </div>
              ))}
            </div>
            <div className="sta-section-title">This month</div>
            {inMonth.length === 0 ? <div className="sta-small">Nothing planned.</div> : inMonth.map((e) => <EventRow key={e.id} e={e} />)}
          </>
        )}

        {events && view === "year" && MONTHS.map((name, mi) => {
          const list = events.filter((e) => e.start_date <= ymd(year, mi, 31) && e.end_date >= ymd(year, mi, 1));
          return list.length ? <div key={name}><div className="sta-section-title">{name}</div>{list.map((e) => <EventRow key={e.id + name} e={e} />)}</div> : null;
        })}
        {events && view === "year" && events.length === 0 && <div className="sta-empty">Nothing planned for {year} yet.</div>}
        <div className="sta-small" style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.values(KINDS).map(([l, c]) => <span key={l}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: c, marginRight: 4 }} />{l}</span>)}
        </div>
      </div>

      {canEdit && (
        <div className="sta-card">
          <h3 style={{ marginBottom: 10 }}>Add to the calendar</h3>
          <span className="sta-label">What is it? *</span>
          <input className="sta-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Annual sports day" />
          <div className="sta-grid2">
            <div><span className="sta-label">Type</span><select className="sta-select" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
            <div><span className="sta-label">Note (optional)</span><input className="sta-input" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></div>
            <div><span className="sta-label">First day *</span><input className="sta-input" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value, endDate: f.endDate || e.target.value })} /></div>
            <div><span className="sta-label">Last day</span><input className="sta-input" type="date" min={f.startDate} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></div>
          </div>
          <button className="sta-btn" disabled={!f.title.trim() || !f.startDate} onClick={add}>Add event</button>
        </div>
      )}
      {canEdit && <UploadBox type="events" onDone={load} title="Upload the whole year calendar from Excel" />}
    </div>
  );
}

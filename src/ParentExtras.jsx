import React, { useState, useEffect } from "react";
import { api } from "./api";
import { ReportCardView, money } from "./Academics.jsx";
import { DAYS } from "./AdminTimetable.jsx";

const MODES = [["results", "Results"], ["homework", "Homework"], ["fees", "Fees"], ["week", "Timetable"]];

// Extra pages for one child: report card, homework, fees and timetable.
export default function ChildExtras({ child }) {
  const [mode, setMode] = useState("results");
  return (
    <div style={{ marginTop: 16 }}>
      <div className="sta-tabs sta-noprint">{MODES.map(([k, l]) => <button key={k} className={`sta-tab ${mode === k ? "active" : ""}`} onClick={() => setMode(k)}>{l}</button>)}</div>
      {mode === "results" && <Results id={child.id} />}
      {mode === "homework" && <Homework id={child.id} />}
      {mode === "fees" && <Fees id={child.id} />}
      {mode === "week" && <Week id={child.id} />}
    </div>
  );
}

function useData(fn, id) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { setD(null); setError(""); fn(id).then(setD).catch((e) => setError(e.message)); }, [id]);
  return [d, error];
}

function Results({ id }) {
  const [card, error] = useData(api.reportCard, id);
  if (error) return <div className="sta-error">{error}</div>;
  if (!card) return <div className="sta-loading">Loading…</div>;
  return <ReportCardView card={card} />;
}

function Homework({ id }) {
  const [list, error] = useData(api.childHomework, id);
  if (error) return <div className="sta-error">{error}</div>;
  if (!list) return <div className="sta-loading">Loading…</div>;
  if (list.length === 0) return <div className="sta-empty">No homework has been given yet.</div>;
  return list.map((h) => (
    <div className="sta-plan" key={h.id}>
      <div className="head"><b>{h.subject ? `${h.subject}: ` : ""}{h.title}</b><span>{h.due_date ? `Due ${h.due_date}` : ""}</span></div>
      {h.details && <div className="sta-small" style={{ marginTop: 4 }}>{h.details}</div>}
      <div className="sta-small" style={{ marginTop: 4 }}>Given on {h.given_on}</div>
    </div>
  ));
}

function Fees({ id }) {
  const [d, error] = useData(api.childFees, id);
  if (error) return <div className="sta-error">{error}</div>;
  if (!d) return <div className="sta-loading">Loading…</div>;
  if (d.rows.length === 0) return <div className="sta-empty">No fees have been charged yet.</div>;
  return (
    <div className="sta-card">
      <div style={{ fontSize: 15, marginBottom: 8 }}>{d.outstanding > 0 ? <>To pay: <b style={{ color: "var(--maroon)" }}>{money(d.outstanding)}</b></> : <b style={{ color: "var(--sage)" }}>All fees are paid. Thank you.</b>}</div>
      <table className="sta-table"><thead><tr><th>Fee</th><th>Amount</th><th>Left</th></tr></thead>
        <tbody>{d.rows.map((r, i) => <tr key={i}><td>{r.title}<div className="sta-small">{r.month}</div></td><td>{money(r.amount)}</td>
          <td style={{ color: r.balance > 0 ? "var(--maroon)" : "var(--sage)", fontWeight: 600 }}>{r.balance > 0 ? money(r.balance) : "Paid"}</td></tr>)}</tbody></table>
      <div className="sta-note">Fees are paid at the school office.</div>
    </div>
  );
}

function Week({ id }) {
  const [slots, error] = useData(api.childTimetable, id);
  if (error) return <div className="sta-error">{error}</div>;
  if (!slots) return <div className="sta-loading">Loading…</div>;
  if (slots.length === 0) return <div className="sta-empty">The timetable has not been set yet.</div>;
  return (
    <div className="sta-card">{DAYS.map((d, i) => {
      const day = slots.filter((s) => s.day === i + 1);
      return day.length ? <div key={d} style={{ marginBottom: 10 }}><b>{d}</b>{day.map((s) => <div key={s.period} className="sta-small">Period {s.period}: {s.subject}{s.teacher ? ` (${s.teacher})` : ""}</div>)}</div> : null;
    })}</div>
  );
}

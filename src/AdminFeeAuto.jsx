import React, { useState, useEffect } from "react";
import { api } from "./api";
import { money } from "./Academics.jsx";
import { VoucherView, waLink } from "./Voucher.jsx";

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function AdminFeeAuto() {
  return (
    <div>
      <Settings />
      <Messages />
      <PrintVouchers />
    </div>
  );
}

function Settings() {
  const [d, setD] = useState(null);
  const [plan, setPlan] = useState({ title: "Tuition fee", amount: "", sectionId: "" });
  const [sections, setSections] = useState([]);
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const [busy, setBusy] = useState(false);
  const load = () => api.autoSettings().then(setD).catch((e) => setMsg({ ok: "", error: e.message }));
  useEffect(() => { load(); api.getSections().then(setSections).catch(() => {}); }, []);
  if (!d) return <div className="sta-card">{msg.error ? <div className="sta-error">{msg.error}</div> : <div className="sta-loading">Loading…</div>}</div>;
  const s = d.settings;
  const save = async (patch) => { const next = { ...s, ...patch }; setMsg({ ok: "", error: "" }); try { await api.saveAutoSettings(next); await load(); } catch (e) { setMsg({ ok: "", error: e.message }); } };
  async function addPlan() { try { await api.addFeePlan({ ...plan, amount: Number(plan.amount), sectionId: plan.sectionId || undefined }); setPlan({ ...plan, amount: "" }); load(); } catch (e) { setMsg({ ok: "", error: e.message }); } }
  async function run() {
    setBusy(true); setMsg({ ok: "", error: "" });
    try {
      const r = await api.runAutoFees();
      setMsg({ ok: `Done. ${r.charged} fees charged, ${r.vouchers} vouchers made, ${r.reminders} reminders made${d.emailReady ? `, ${r.emailed} emails sent${r.emailFailed ? ` (${r.emailFailed} failed)` : ""}` : ""}.`, error: "" });
    } catch (e) { setMsg({ ok: "", error: e.message }); } finally { setBusy(false); }
  }
  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 6 }}>Automatic monthly fees and vouchers</h3>
      <div className="sta-small" style={{ marginBottom: 10 }}>Each month the system charges the fees below, makes a voucher for every student who owes money, and sends a reminder if it is still unpaid after the waiting days.</div>

      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, fontSize: 14.5 }}>
        <input type="checkbox" checked={s.autoOn} onChange={(e) => save({ autoOn: e.target.checked })} />
        <b>{s.autoOn ? "Automatic system is ON" : "Automatic system is OFF"}</b>
      </label>
      <div className="sta-grid2">
        <div><span className="sta-label">Fee is due on day of the month</span>
          <select className="sta-select" value={s.dueDay} onChange={(e) => save({ dueDay: Number(e.target.value) })}>{Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></div>
        <div><span className="sta-label">Send a reminder after (days)</span>
          <select className="sta-select" value={s.reminderDays} onChange={(e) => save({ reminderDays: Number(e.target.value) })}>{[3, 5, 7, 10, 14].map((n) => <option key={n}>{n}</option>)}</select></div>
      </div>

      <div className="sta-section-title">Monthly fees</div>
      {d.plans.length === 0 && <div className="sta-empty">No monthly fee added yet. Add the tuition fee below.</div>}
      {d.plans.length > 0 && <table className="sta-table"><tbody>{d.plans.map((p) => (
        <tr key={p.id}><td><b>{p.title}</b><div className="sta-small">{p.grade ? `Only class ${p.grade}-${p.section}` : "Every student"}</div></td><td>{money(p.amount)}</td>
          <td><button className="sta-linkbtn" onClick={() => api.deleteFeePlan(p.id).then(load)}>Remove</button></td></tr>
      ))}</tbody></table>}
      <div className="sta-grid2" style={{ marginTop: 10 }}>
        <div><span className="sta-label">Fee name</span><input className="sta-input" value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} /></div>
        <div><span className="sta-label">Amount (Rs)</span><input className="sta-input" type="number" value={plan.amount} onChange={(e) => setPlan({ ...plan, amount: e.target.value })} /></div>
      </div>
      <select className="sta-select" value={plan.sectionId} onChange={(e) => setPlan({ ...plan, sectionId: e.target.value })}>
        <option value="">Every student</option>{sections.map((x) => <option key={x.id} value={x.id}>Only class {x.grade}-{x.name}</option>)}
      </select>
      <button className="sta-btn secondary" disabled={!plan.title.trim() || !(Number(plan.amount) > 0)} onClick={addPlan}>Add this monthly fee</button>

      <hr className="sta-divider" />
      <button className="sta-btn" disabled={busy || d.plans.length === 0} onClick={run}>{busy ? "Working..." : "Run now for this month"}</button>
      <div className="sta-note">Running it again is safe: nobody is charged twice and nobody gets the same message twice.</div>
      {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
      {msg.error && <div className="sta-error">{msg.error}</div>}

      <div className="sta-section-title">How messages reach parents</div>
      <ul className="sta-list">
        <li>Every voucher is always in the parent portal (Fees tab), where parents can print it.</li>
        <li>Email: {d.emailReady ? <b>ready. Parents with an email address get it automatically.</b> : <>not set up yet. Add the SMTP settings in Render to turn it on.</>}</li>
        <li>WhatsApp: open the list below and tap each parent's button. It opens WhatsApp with the message already written.</li>
      </ul>
      <div className="sta-note">To make it run by itself every day, set a free daily timer (cron-job.org) to open <b>/cron/daily?key=YOUR_SECRET</b> on your server. Until then, press "Run now" once a month.</div>
    </div>
  );
}

function Messages() {
  const [rows, setRows] = useState(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const load = () => api.feeNotices(pending).then(setRows).catch((e) => setError(e.message));
  useEffect(() => { setRows(null); load(); }, [pending]);
  async function done(n, v) { await api.markNotice(n.id, v); load(); }
  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 8 }}>Messages to send</h3>
      <div className="sta-row" style={{ marginBottom: 10 }}>
        <button className={`sta-btn small ${pending ? "" : "secondary"}`} onClick={() => setPending(true)}>Not sent on WhatsApp yet</button>
        <button className={`sta-btn small ${pending ? "secondary" : ""}`} onClick={() => setPending(false)}>All messages</button>
      </div>
      {rows === null && !error && <div className="sta-loading">Loading…</div>}
      {rows && rows.length === 0 && <div className="sta-empty">Nothing waiting. Messages appear here after the system makes vouchers.</div>}
      {rows && rows.map((n) => {
        const link = waLink(n.phone, n.message);
        return (
          <div key={n.id} style={{ borderBottom: "1px solid var(--rule)", padding: "9px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div><b>{n.name}</b> <span className={`sta-chip ${n.kind === "reminder" ? "chip-support" : "chip-good"}`}>{n.kind === "reminder" ? "Reminder" : "Voucher"} {n.month}</span>
                <div className="sta-small">{n.grade ? `${n.grade}-${n.section} · ` : ""}{n.phone || "no phone number"}{n.emailed ? " · emailed ✓" : ""}</div></div>
              <div style={{ whiteSpace: "nowrap" }}>
                {link ? <a className="sta-btn small" style={{ textDecoration: "none", display: "inline-block" }} href={link} target="_blank" rel="noreferrer" onClick={() => setTimeout(() => done(n, true), 800)}>WhatsApp</a> : <span className="sta-small">No valid phone</span>}
                {n.wa_done && <button className="sta-linkbtn" style={{ marginLeft: 8 }} onClick={() => done(n, false)}>sent ✓ undo</button>}
              </div>
            </div>
          </div>
        );
      })}
      {error && <div className="sta-error">{error}</div>}
    </div>
  );
}

function PrintVouchers() {
  const [month, setMonth] = useState(thisMonth());
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState("");
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.getSections().then(setSections).catch(() => {}); }, []);
  async function show() { setError(""); setList(null); try { setList(await api.vouchers(month, sectionId)); } catch (e) { setError(e.message); } }
  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 8 }}>Print vouchers</h3>
      <div className="sta-grid2">
        <div><span className="sta-label">Month</span><input className="sta-input" type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} /></div>
        <div><span className="sta-label">Class</span><select className="sta-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}><option value="">Whole school</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.grade}-{s.name}</option>)}</select></div>
      </div>
      <button className="sta-btn secondary" onClick={show}>Show the vouchers</button>
      {error && <div className="sta-error">{error}</div>}
      {list && list.length === 0 && <div className="sta-empty">No fees found for this month and class.</div>}
      {list && list.length > 0 && <button className="sta-btn" style={{ marginTop: 10 }} onClick={() => window.print()}>Print {list.length} vouchers</button>}
      <div className="sta-printarea">{list && list.map((v) => <VoucherView key={v.student.id} v={v} />)}</div>
    </div>
  );
}

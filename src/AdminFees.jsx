import React, { useState, useEffect } from "react";
import { api } from "./api";
import { money } from "./Academics.jsx";

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function AdminFees() {
  const [month, setMonth] = useState(thisMonth());
  const [sections, setSections] = useState([]);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [gen, setGen] = useState({ title: "Tuition fee", amount: "", sectionId: "" });
  const [pay, setPay] = useState({});
  const [msg, setMsg] = useState({ ok: "", error: "" });

  useEffect(() => { api.getSections().then(setSections).catch(() => {}); }, []);
  function load() {
    api.feeSummary(month).then(setSummary).catch((e) => setMsg({ ok: "", error: e.message }));
    api.feeLedger({ month, status, q }).then(setRows).catch((e) => setMsg({ ok: "", error: e.message }));
  }
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [month, status, q]);

  async function generate() {
    setMsg({ ok: "", error: "" });
    try {
      const r = await api.generateFees({ month, title: gen.title, amount: Number(gen.amount), sectionId: gen.sectionId || undefined });
      setMsg({ ok: r.created ? `${r.created} fees created for ${month}.` : "Everyone already has this fee for this month.", error: "" });
      load();
    } catch (e) { setMsg({ ok: "", error: e.message }); }
  }
  async function receive(r) {
    const amount = Number(pay[r.id] ?? r.balance);
    setMsg({ ok: "", error: "" });
    try { await api.payFee({ chargeId: r.id, amount, method: "Cash" }); setPay({ ...pay, [r.id]: undefined }); setMsg({ ok: `${money(amount)} received from ${r.name}.`, error: "" }); load(); }
    catch (e) { setMsg({ ok: "", error: e.message }); }
  }
  async function del(r) {
    if (!window.confirm(`Remove ${r.title} for ${r.name}? Any payments on it are removed too.`)) return;
    await api.deleteCharge(r.id); load();
  }

  return (
    <div>
      <div className="sta-card">
        <span className="sta-label">Month</span>
        <input className="sta-input" type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} />
        {summary && (
          <div className="sta-stat-grid">
            <div className="sta-stat"><div className="num">{money(summary.due)}</div><div className="lbl">To collect</div></div>
            <div className="sta-stat"><div className="num">{money(summary.collected)}</div><div className="lbl">Collected</div></div>
            <div className="sta-stat"><div className="num" style={{ color: summary.outstanding > 0 ? "var(--maroon)" : undefined }}>{money(summary.outstanding)}</div><div className="lbl">Still to come</div></div>
            <div className="sta-stat"><div className="num">{summary.due > 0 ? Math.round((summary.collected / summary.due) * 100) : 0}%</div><div className="lbl">Collected so far</div></div>
          </div>
        )}
      </div>

      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>Charge a fee for {month}</h3>
        <div className="sta-grid2">
          <div><span className="sta-label">Fee name</span><input className="sta-input" value={gen.title} onChange={(e) => setGen({ ...gen, title: e.target.value })} /></div>
          <div><span className="sta-label">Amount per student (Rs)</span><input className="sta-input" type="number" value={gen.amount} onChange={(e) => setGen({ ...gen, amount: e.target.value })} /></div>
        </div>
        <span className="sta-label">Who pays</span>
        <select className="sta-select" value={gen.sectionId} onChange={(e) => setGen({ ...gen, sectionId: e.target.value })}>
          <option value="">Every student in the school</option>
          {sections.map((s) => <option key={s.id} value={s.id}>Only class {s.grade}-{s.name}</option>)}
        </select>
        <button className="sta-btn" disabled={!gen.title.trim() || !(Number(gen.amount) > 0)} onClick={generate}>Create fees</button>
        <div className="sta-note">Pressing this twice never charges anyone twice.</div>
        {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
        {msg.error && <div className="sta-error">{msg.error}</div>}
      </div>

      <div className="sta-card">
        <div className="sta-row">
          <input className="sta-input" placeholder="Search student" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="sta-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option><option value="unpaid">Not fully paid</option><option value="paid">Fully paid</option>
          </select>
        </div>
        {rows === null && <div className="sta-loading">Loading…</div>}
        {rows && rows.length === 0 && <div className="sta-empty">No fees for this month yet.</div>}
        {rows && rows.length > 0 && (
          <div className="sta-scroll"><table className="sta-table">
            <thead><tr><th>Student</th><th>Fee</th><th>Amount</th><th>Left</th><th>Receive</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.name}</b><div className="sta-small">{r.grade ? `${r.grade}-${r.section}` : ""}</div></td>
                <td>{r.title}</td><td>{money(r.amount)}</td>
                <td style={{ color: r.balance > 0 ? "var(--maroon)" : "var(--sage)", fontWeight: 600 }}>{r.balance > 0 ? money(r.balance) : "Paid"}</td>
                <td>{r.balance > 0 && <><input className="sta-mini-input" style={{ width: 70 }} type="number" value={pay[r.id] ?? r.balance} onChange={(e) => setPay({ ...pay, [r.id]: e.target.value })} /> <button className="sta-btn small" onClick={() => receive(r)}>Receive</button></>}</td>
                <td><button className="sta-linkbtn" onClick={() => del(r)}>Remove</button></td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>
    </div>
  );
}

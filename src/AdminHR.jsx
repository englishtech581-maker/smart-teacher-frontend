import React, { useState, useEffect } from "react";
import { api } from "./api";
import UploadBox from "./UploadBox.jsx";
import { money } from "./Academics.jsx";

const MODES = [["att", "Attendance"], ["leave", "Leave"], ["pay", "Salary"], ["rev", "Performance"]];
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const ST = [["present", "P", "Present"], ["late", "L", "Late"], ["absent", "A", "Absent"], ["leave", "Lv", "On leave"]];

export default function AdminHR() {
  const [mode, setMode] = useState("att");
  return (
    <div>
      <div className="sta-tabs">{MODES.map(([k, l]) => <button key={k} className={`sta-tab ${mode === k ? "active" : ""}`} onClick={() => setMode(k)}>{l}</button>)}</div>
      {mode === "att" && <StaffAttendance />}
      {mode === "leave" && <Leave />}
      {mode === "pay" && <Salary />}
      {mode === "rev" && <Reviews />}
    </div>
  );
}

function StaffAttendance() {
  const [date, setDate] = useState(today());
  const [staff, setStaff] = useState(null);
  const [sum, setSum] = useState([]);
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const load = () => {
    api.staffAttendance(date).then((r) => setStaff(r.staff)).catch((e) => setMsg({ ok: "", error: e.message }));
    api.staffAttendanceSummary(date.slice(0, 7)).then(setSum).catch(() => {});
  };
  useEffect(() => { setStaff(null); load(); }, [date]);
  const set = (id, status) => setStaff((l) => l.map((s) => (s.id === id ? { ...s, status } : s)));
  async function save() {
    setMsg({ ok: "", error: "" });
    try { const r = await api.saveStaffAttendance({ date, records: staff.filter((s) => s.status).map((s) => ({ staffId: s.id, status: s.status })) }); setMsg({ ok: `${r.saved} saved.`, error: "" }); load(); }
    catch (e) { setMsg({ ok: "", error: e.message }); }
  }
  return (
    <div className="sta-card">
      <span className="sta-label">Date</span>
      <input className="sta-input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} />
      {staff === null && <div className="sta-loading">Loading…</div>}
      {staff && staff.length === 0 && <div className="sta-empty">Add your staff first in the Staff tab.</div>}
      {staff && staff.length > 0 && (
        <>
          <div className="sta-row" style={{ marginBottom: 10 }}>
            <button className="sta-btn small secondary" onClick={() => setStaff(staff.map((s) => ({ ...s, status: s.status || "present" })))}>Mark everyone not yet marked as present</button>
          </div>
          <table className="sta-table"><tbody>{staff.map((s) => (
            <tr key={s.id}><td><b>{s.name}</b><div className="sta-small">{s.role || ""}</div></td>
              <td style={{ whiteSpace: "nowrap" }}>{ST.map(([k, short, long]) => <button key={k} title={long} className={`sta-status-btn ${s.status === k ? "on" : ""}`} style={{ fontSize: 12, margin: 2 }} onClick={() => set(s.id, k)}>{short}</button>)}</td></tr>
          ))}</tbody></table>
          <button className="sta-btn" style={{ marginTop: 12 }} onClick={save}>Save attendance</button>
          <div className="sta-note">P present · L late · A absent (a day's salary is taken off) · Lv approved leave</div>
        </>
      )}
      {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
      {msg.error && <div className="sta-error">{msg.error}</div>}
      {sum.length > 0 && (
        <>
          <div className="sta-section-title">This month, {date.slice(0, 7)}</div>
          <div className="sta-scroll"><table className="sta-table"><thead><tr><th>Name</th><th>Present</th><th>Late</th><th>Absent</th><th>Leave</th></tr></thead>
            <tbody>{sum.map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.present}</td><td>{s.late}</td><td>{s.absent}</td><td>{s.leave}</td></tr>)}</tbody></table></div>
        </>
      )}
      <UploadBox type="staffAttendance" onDone={load} title="Upload staff attendance from Excel" />
    </div>
  );
}

function Leave() {
  const [list, setList] = useState(null);
  const [staff, setStaff] = useState([]);
  const [f, setF] = useState({ staffId: "", fromDate: today(), toDate: today(), kind: "Casual", reason: "" });
  const [error, setError] = useState("");
  const load = () => api.leaveList().then(setList).catch((e) => setError(e.message));
  useEffect(() => { load(); api.listStaff().then(setStaff).catch(() => {}); }, []);
  async function add() { setError(""); try { await api.addLeave(f); setF({ ...f, reason: "" }); load(); } catch (e) { setError(e.message); } }
  return (
    <div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>Leave requests</h3>
        {list === null && !error && <div className="sta-loading">Loading…</div>}
        {list && list.length === 0 && <div className="sta-empty">No leave requests.</div>}
        {list && list.length > 0 && <div className="sta-scroll"><table className="sta-table"><tbody>{list.map((l) => (
          <tr key={l.id}><td><b>{l.name}</b><div className="sta-small">{l.kind} · {l.from_date} to {l.to_date}{l.reason ? ` · ${l.reason}` : ""}</div></td>
            <td>{l.status === "pending"
              ? <><button className="sta-btn small" onClick={() => api.setLeaveStatus(l.id, "approved").then(load)}>Approve</button> <button className="sta-linkbtn" onClick={() => api.setLeaveStatus(l.id, "rejected").then(load)}>Reject</button></>
              : <span className={`sta-chip ${l.status === "approved" ? "chip-exc" : "chip-risk"}`}>{l.status}</span>}</td></tr>
        ))}</tbody></table></div>}
      </div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>Record leave</h3>
        <span className="sta-label">Staff member</span>
        <select className="sta-select" value={f.staffId} onChange={(e) => setF({ ...f, staffId: e.target.value })}><option value="">Choose…</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <div className="sta-grid2">
          <div><span className="sta-label">From</span><input className="sta-input" type="date" value={f.fromDate} onChange={(e) => setF({ ...f, fromDate: e.target.value })} /></div>
          <div><span className="sta-label">To</span><input className="sta-input" type="date" value={f.toDate} onChange={(e) => setF({ ...f, toDate: e.target.value })} /></div>
          <div><span className="sta-label">Type</span><select className="sta-select" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{["Casual", "Sick", "Annual", "Unpaid"].map((k) => <option key={k}>{k}</option>)}</select></div>
          <div><span className="sta-label">Reason</span><input className="sta-input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
        </div>
        <button className="sta-btn" disabled={!f.staffId} onClick={add}>Save as approved leave</button>
        {error && <div className="sta-error">{error}</div>}
      </div>
    </div>
  );
}

function Salary() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState(null);
  const [staff, setStaff] = useState([]);
  const [base, setBase] = useState({});
  const [edit, setEdit] = useState({});
  const [msg, setMsg] = useState({ ok: "", error: "" });
  const load = () => api.payroll(month).then(setRows).catch((e) => setMsg({ ok: "", error: e.message }));
  const loadStaff = () => api.staffReviews().then(setStaff).catch(() => {});
  useEffect(() => { loadStaff(); }, []);
  useEffect(() => { setRows(null); load(); }, [month]);
  async function saveBase(s) { await api.setSalary(s.id, Number(base[s.id])); setBase({ ...base, [s.id]: undefined }); loadStaff(); }
  async function gen() { try { const r = await api.generatePayroll(month); setMsg({ ok: r.created ? `Salary sheet made for ${r.created} people.` : "The salary sheet for this month already exists.", error: "" }); load(); } catch (e) { setMsg({ ok: "", error: e.message }); } }
  async function save(r, extra) {
    const e = edit[r.id] || {};
    await api.updatePayroll(r.id, { allowances: e.allowances !== undefined ? Number(e.allowances) : undefined, deductions: e.deductions !== undefined ? Number(e.deductions) : undefined, ...extra });
    setEdit({ ...edit, [r.id]: undefined }); load();
  }
  return (
    <div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>Monthly salaries</h3>
        <div className="sta-scroll"><table className="sta-table"><thead><tr><th>Name</th><th>Monthly salary</th><th></th></tr></thead><tbody>
          {staff.map((s) => <tr key={s.id}><td>{s.name}<div className="sta-small">{s.role || ""}</div></td>
            <td><input className="sta-mini-input" style={{ width: 90 }} type="number" value={base[s.id] ?? s.base_salary ?? ""} onChange={(e) => setBase({ ...base, [s.id]: e.target.value })} /></td>
            <td>{base[s.id] !== undefined && base[s.id] !== "" && <button className="sta-btn small" onClick={() => saveBase(s)}>Save</button>}</td></tr>)}
        </tbody></table></div>
        {staff.length === 0 && <div className="sta-empty">Add staff first.</div>}
      </div>
      <div className="sta-card">
        <span className="sta-label">Salary sheet for</span>
        <input className="sta-input" type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} />
        <button className="sta-btn secondary" onClick={gen}>Make this month's salary sheet</button>
        <div className="sta-note">Each absent day marked in Attendance takes off 1/30 of the salary. You can change any amount afterwards.</div>
        {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
        {msg.error && <div className="sta-error">{msg.error}</div>}
        {rows && rows.length > 0 && (
          <div className="sta-scroll" style={{ marginTop: 10 }}><table className="sta-table">
            <thead><tr><th>Name</th><th>Salary</th><th>Extra</th><th>Cut</th><th>To pay</th><th></th></tr></thead>
            <tbody>{rows.map((r) => {
              const e = edit[r.id] || {}; const al = e.allowances ?? r.allowances, de = e.deductions ?? r.deductions;
              return <tr key={r.id}><td>{r.name}</td><td>{money(r.base)}</td>
                <td><input className="sta-mini-input" type="number" value={al} onChange={(x) => setEdit({ ...edit, [r.id]: { ...e, allowances: x.target.value } })} /></td>
                <td><input className="sta-mini-input" type="number" value={de} onChange={(x) => setEdit({ ...edit, [r.id]: { ...e, deductions: x.target.value } })} /></td>
                <td><b>{money(r.base + Number(al || 0) - Number(de || 0))}</b></td>
                <td style={{ whiteSpace: "nowrap" }}>{(e.allowances !== undefined || e.deductions !== undefined) && <button className="sta-btn small" onClick={() => save(r, {})}>Save</button>}
                  {r.status === "paid" ? <button className="sta-linkbtn" onClick={() => save(r, { status: "unpaid" })}>Paid ✓ undo</button> : <button className="sta-btn small secondary" onClick={() => save(r, { status: "paid" })}>Mark paid</button>}</td></tr>;
            })}</tbody></table></div>
        )}
        {rows && rows.length === 0 && <div className="sta-empty">No salary sheet for {month} yet. Set each person's monthly salary above, then make the sheet.</div>}
      </div>
      <UploadBox type="salary" onDone={loadStaff} title="Upload monthly salaries of the staff from Excel" />
    </div>
  );
}

function Reviews() {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  const [f, setF] = useState({ rating: 4, notes: "" });
  const [error, setError] = useState("");
  const load = () => api.staffReviews().then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  async function save(s) { setError(""); try { await api.addReview({ staffId: s.id, rating: Number(f.rating), notes: f.notes }); setOpen(null); setF({ rating: 4, notes: "" }); load(); } catch (e) { setError(e.message); } }
  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 10 }}>Staff performance</h3>
      {rows === null && !error && <div className="sta-loading">Loading…</div>}
      {rows && rows.length === 0 && <div className="sta-empty">Add staff first.</div>}
      {rows && rows.map((s) => (
        <div key={s.id} style={{ borderBottom: "1px solid var(--rule)", padding: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div><b>{s.name}</b> <span className="sta-small">{s.role || ""}</span>
              <div className="sta-small">{s.avg_rating ? `Average ${s.avg_rating}/5 from ${s.reviews} review${s.reviews === 1 ? "" : "s"}` : "Not reviewed yet"}{s.last_note ? ` · "${s.last_note}"` : ""}</div></div>
            <button className="sta-btn small secondary" onClick={() => setOpen(open === s.id ? null : s.id)}>Add review</button>
          </div>
          {open === s.id && (
            <div style={{ marginTop: 8 }}>
              <span className="sta-label">Rating (1 to 5)</span>
              <select className="sta-select" value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select>
              <span className="sta-label">Notes</span>
              <input className="sta-input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Punctuality, results of their classes, behaviour…" />
              <button className="sta-btn" onClick={() => save(s)}>Save review</button>
            </div>
          )}
        </div>
      ))}
      {error && <div className="sta-error">{error}</div>}
    </div>
  );
}

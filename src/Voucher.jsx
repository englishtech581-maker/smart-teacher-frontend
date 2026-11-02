import React from "react";
import { money } from "./Academics.jsx";

const dmy = (d) => { const [y, m, day] = String(d).split("-"); return `${day}-${m}-${y}`; };

function Copy({ v, label }) {
  const late = v.balance > 0 && v.dueDate < new Date().toISOString().slice(0, 10);
  return (
    <div className="sta-voucher-copy">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <b style={{ fontFamily: "Georgia,serif", fontSize: 16 }}>{v.school}</b>
        <span className="sta-small">{label}</span>
      </div>
      <div className="sta-small">Fee voucher, {v.monthName} · No. {v.voucherNo}</div>
      <div style={{ margin: "8px 0", fontSize: 14 }}>
        <b>{v.student.name}</b> · {v.student.grade ? `Class ${v.student.grade}-${v.student.section}` : "No class"}
        {v.student.admissionNo ? ` · Adm. ${v.student.admissionNo}` : ""}
      </div>
      <table className="sta-table">
        <tbody>
          {v.items.map((i, k) => <tr key={k}><td>{i.title}</td><td style={{ textAlign: "right" }}>{money(i.amount)}</td></tr>)}
          {v.previousDues > 0 && <tr><td>Unpaid from earlier months</td><td style={{ textAlign: "right" }}>{money(v.previousDues)}</td></tr>}
          {v.paid > 0 && <tr><td>Already paid</td><td style={{ textAlign: "right" }}>- {money(v.paid)}</td></tr>}
          <tr><td><b>{v.balance > 0 ? "Amount to pay" : "Nothing to pay"}</b></td><td style={{ textAlign: "right" }}><b>{money(Math.max(v.balance, 0))}</b></td></tr>
        </tbody>
      </table>
      <div className="sta-small" style={{ marginTop: 6 }}>
        {v.balance > 0 ? <>Pay by <b>{dmy(v.dueDate)}</b>{late ? " (the due date has passed)" : ""}</> : "Paid. Thank you."}
        {v.schoolPhone ? ` · School phone ${v.schoolPhone}` : ""}
      </div>
    </div>
  );
}

// One voucher with a parent copy and a school copy, so it can be cut in half after printing.
export function VoucherView({ v }) {
  return (
    <div className="sta-voucher">
      <Copy v={v} label="Parent copy" />
      <div className="sta-cut">✂ - - - - - - - - - - - - - - - - - - - - - - - -</div>
      <Copy v={v} label="School copy" />
    </div>
  );
}

export function waLink(phone, text) {
  const p = String(phone || "");
  if (!/^03\d{9}$/.test(p)) return null;
  return `https://wa.me/92${p.slice(1)}?text=${encodeURIComponent(text)}`;
}

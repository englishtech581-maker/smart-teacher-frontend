import React, { useState } from "react";
import { api } from "./api";
import { FIELDS, readSheet, autoMap, buildRows } from "./importLogic.js";

const CONFIG = {
  students: { noun: "students", send: (rows) => api.importStudents(rows), sample: ["Ali Raza", "A-1021", "7-A", "M", "Raza Ahmed", "03001234567", ""] },
  staff: { noun: "staff members", send: (rows) => api.importStaff(rows), sample: ["Ms Rabia", "Coordinator", "Primary", "03001234567", "", "2017-04-01"] },
};
const BATCH = 300;

// Reads an Excel or CSV file, lets the principal check how the columns were understood, then saves everything.
export default function ImportPanel({ type = "students", onDone }) {
  const cfg = CONFIG[type];
  const fields = FIELDS[type].filter((f) => type !== "students" || f.key !== "sectionLetter" || true);
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState(null); // { headers, body }
  const [map, setMap] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);

  async function choose(e) {
    const f = e.target.files[0];
    if (!f) return;
    setError(""); setResult(null); setSheet(null);
    try {
      const parsed = readSheet(await f.arrayBuffer());
      if (!parsed.headers.length || !parsed.body.length) throw new Error("No rows were found. The first sheet needs a heading row and at least one row below it.");
      setFile(f);
      setSheet(parsed);
      setMap(autoMap(type, parsed.headers));
    } catch (err) {
      setError(err.message && err.message.startsWith("No rows") ? err.message : "This file could not be read. Save it as .xlsx or .csv and try again.");
    }
  }

  const rows = sheet ? buildRows(type, sheet.body, map) : [];
  const ready = rows.filter((r) => r.name);
  const nameMapped = map.name >= 0;

  async function run() {
    setBusy(`Importing… 0 of ${ready.length}`);
    setError("");
    let imported = 0, skipped = [];
    try {
      for (let i = 0; i < ready.length; i += BATCH) {
        const res = await cfg.send(ready.slice(i, i + BATCH));
        imported += res.imported;
        skipped = skipped.concat(res.skipped);
        setBusy(`Importing… ${Math.min(i + BATCH, ready.length)} of ${ready.length}`);
      }
      // rows without a name never left the browser, so they are listed here too
      const noName = rows.filter((r) => !r.name).map((r) => ({ row: r.row, reason: "Name is missing" }));
      setResult({ imported, skipped: [...noName, ...skipped].sort((a, b) => a.row - b.row) });
      setSheet(null); setFile(null);
      if (onDone) onDone();
    } catch (err) {
      setError(err.message === "Not found" ? "The server has not been updated yet. Finish piece 1 first." : `${err.message}. Rows saved so far: ${imported}.`);
    } finally {
      setBusy("");
    }
  }

  function template() {
    const head = FIELDS[type].filter((f) => f.key !== "sectionLetter").map((f) => f.label).join(",");
    const blob = new Blob([`${head}\n${cfg.sample.join(",")}\n`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${type}-template.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 6 }}>Upload a spreadsheet of {cfg.noun}</h3>
      <div className="sta-small" style={{ marginBottom: 12 }}>
        Use an Excel (.xlsx) or CSV file. The first sheet is read and the heading row is found automatically.
        Uploading the same file twice does not create duplicates.
      </div>
      <input className="sta-input" type="file" accept=".xlsx,.xls,.csv" onChange={choose} />
      <button className="sta-linkbtn" onClick={template}>Download a blank template</button>
      {error && <div className="sta-error">{error}</div>}

      {sheet && (
        <>
          <div className="sta-note"><b>{file.name}</b>: {sheet.body.length} rows found. {ready.length} ready{rows.length - ready.length ? `, ${rows.length - ready.length} without a name will be skipped` : ""}.</div>

          <div className="sta-section-title">Check the columns</div>
          <div className="sta-scroll">
            <table className="sta-table">
              <thead><tr><th>We need</th><th>Column in your file</th></tr></thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f.key}>
                    <td>{f.label}{f.required ? " *" : ""}</td>
                    <td>
                      <select className="sta-select" style={{ marginBottom: 0 }} value={map[f.key] ?? -1} onChange={(e) => setMap({ ...map, [f.key]: Number(e.target.value) })}>
                        <option value={-1}>Not in my file</option>
                        {sheet.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!nameMapped && <div className="sta-error">Choose which column holds the name.</div>}

          <div className="sta-section-title">First rows</div>
          <div className="sta-scroll">
            <table className="sta-table">
              <thead><tr><th>Row</th>{fields.filter((f) => !(type === "students" && f.key === "sectionLetter")).map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 5).map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    {fields.filter((f) => !(type === "students" && f.key === "sectionLetter")).map((f) => <td key={f.key}>{r[f.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="sta-btn" style={{ marginTop: 14 }} disabled={!nameMapped || !ready.length || !!busy} onClick={run}>
            {busy || `Import ${ready.length} ${cfg.noun}`}
          </button>
        </>
      )}

      {result && (
        <>
          <div className="sta-note" style={{ color: "var(--sage)" }}><b>{result.imported}</b> {cfg.noun} added{result.skipped.length ? `, ${result.skipped.length} skipped` : ""}.</div>
          {result.skipped.length > 0 && (
            <div className="sta-scroll">
              <table className="sta-table">
                <thead><tr><th>Row in your file</th><th>Name</th><th>Why it was skipped</th></tr></thead>
                <tbody>
                  {result.skipped.slice(0, 50).map((s, i) => <tr key={i}><td>{s.row}</td><td>{s.name || ""}</td><td>{s.reason}</td></tr>)}
                </tbody>
              </table>
              {result.skipped.length > 50 && <div className="sta-small">Showing the first 50 of {result.skipped.length}.</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { api } from "./api";
import { FIELDS, CONFIG, readSheet, autoMap, buildRows, buildWideRows, suggestWideColumns, templateText } from "./importLogic.js";

const BATCH = 300;

function download(name, text) {
  const blob = new Blob([text], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Reads an Excel or CSV file, lets the person check how the columns were understood, then saves everything.
// Used on every tab: `type` says what is being uploaded, `extra` carries things such as the chosen exam or class.
export default function ImportPanel({ type = "students", onDone, extra }) {
  const cfg = CONFIG[type];
  const fields = FIELDS[type];
  const wideCfg = cfg.wide;
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState(null); // { headers, body }
  const [map, setMap] = useState({});
  const [layout, setLayout] = useState("long"); // "long": one row per entry, "wide": one column per subject / date
  const [cols, setCols] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const [exams, setExams] = useState(null);
  const [examId, setExamId] = useState((extra && extra.examId) || "");
  const [total, setTotal] = useState("100");

  useEffect(() => {
    if (!cfg.needsExam || (extra && extra.examId)) return;
    api.listExams().then((e) => { setExams(e); if (e[0]) setExamId(e[0].id); }).catch(() => setExams([]));
  }, [type]);
  useEffect(() => { if (extra && extra.examId) setExamId(extra.examId); }, [extra && extra.examId]);

  async function choose(e) {
    const f = e.target.files[0];
    if (!f) return;
    setError(""); setResult(null); setSheet(null);
    try {
      const parsed = readSheet(await f.arrayBuffer());
      if (!parsed.headers.length || !parsed.body.length) throw new Error("No rows were found. The first sheet needs a heading row and at least one row below it.");
      const m = autoMap(type, parsed.headers);
      setFile(f);
      setSheet(parsed);
      setMap(m);
      // a file that has no Subject (or Date) column but has several number columns is one-column-per-subject
      if (wideCfg && !(m[wideCfg.colKey] >= 0 && m[wideCfg.valueKey] >= 0)) {
        const mm = { ...m, [wideCfg.colKey]: -1, [wideCfg.valueKey]: -1 };
        setMap(mm);
        setLayout("wide");
        setCols(suggestWideColumns(type, parsed.headers, parsed.body, mm));
      } else {
        setLayout("long");
        setCols([]);
      }
    } catch (err) {
      setError(err.message && err.message.startsWith("No rows") ? err.message : "This file could not be read. Save it as .xlsx or .csv and try again.");
    }
  }

  const wide = !!wideCfg && layout === "wide";
  const shownFields = wide ? fields.filter((f) => f.key !== wideCfg.colKey && f.key !== wideCfg.valueKey && f.key !== "total") : fields;
  const rows = sheet ? (wide ? buildWideRows(type, sheet.body, map, cols, sheet.headers) : buildRows(type, sheet.body, map)) : [];
  const problems = rows.map((r) => ({ r, why: cfg.need(r) }));
  const ready = problems.filter((p) => !p.why).map((p) => p.r);
  const bad = problems.filter((p) => p.why).map((p) => ({ row: p.r.row, name: p.r.name || p.r.title || p.r.className || "", reason: p.why }));
  const wideReady = !wide || cols.length > 0;
  const needMarkTotal = cfg.needsTotal && !(Number(total) > 0) && !(map.total >= 0 && !wide);
  const blocked = (cfg.needsExam && !examId) || needMarkTotal;

  const toggleCol = (i) => setCols((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));

  async function run() {
    setBusy(`Saving… 0 of ${ready.length}`);
    setError("");
    let imported = 0, skipped = [], classes = 0;
    const body = { ...(extra || {}), ...(cfg.needsExam ? { examId } : {}), ...(cfg.needsTotal ? { total: Number(total) } : {}) };
    try {
      const size = cfg.single ? Math.max(ready.length, 1) : BATCH;
      for (let i = 0; i < ready.length; i += size) {
        const res = await api.importRows(cfg.endpoint, ready.slice(i, i + size), body);
        imported += res.imported;
        classes += res.classes || 0;
        skipped = skipped.concat(res.skipped);
        setBusy(`Saving… ${Math.min(i + size, ready.length)} of ${ready.length}`);
      }
      setResult({ imported, classes, skipped: [...bad, ...skipped].sort((a, b) => a.row - b.row) });
      setSheet(null); setFile(null);
      if (onDone) onDone();
    } catch (err) {
      setError(err.message === "Not found" ? "The server has not been updated yet. Update the server first, then try again." : `${err.message}. Rows saved so far: ${imported}.`);
    } finally {
      setBusy("");
    }
  }

  const missingRequired = fields.filter((f) => f.required && !(map[f.key] >= 0));

  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 6 }}>Upload a spreadsheet of {cfg.noun}</h3>
      <div className="sta-small" style={{ marginBottom: 12 }}>
        Use an Excel (.xlsx) or CSV file. The first sheet is read and the heading row is found automatically.
        {cfg.warn ? ` ${cfg.warn}` : " Uploading the same file twice does not create duplicates."}
      </div>

      {cfg.needsExam && !(extra && extra.examId) && (
        exams && exams.length === 0
          ? <div className="sta-error">Create an exam first (Exams tab), then upload the marks.</div>
          : <select className="sta-select" value={examId} onChange={(e) => setExamId(e.target.value)}>
              {(exams || []).map((x) => <option key={x.id} value={x.id}>{x.name}{x.year ? ` ${x.year}` : ""}</option>)}
            </select>
      )}
      {cfg.needsTotal && (
        <label className="sta-small" style={{ display: "block", marginBottom: 8 }}>
          Total marks of each paper{wideCfg ? "" : " (used when the file has no total column)"}{" "}
          <input className="sta-input" style={{ width: 90, display: "inline-block", marginBottom: 0 }} type="number" min="1" value={total} onChange={(e) => setTotal(e.target.value)} />
        </label>
      )}

      <input className="sta-input" type="file" accept=".xlsx,.xls,.csv" onChange={choose} />
      <button className="sta-linkbtn" onClick={() => download(`${type}-template.csv`, templateText(type, false))}>Download a blank template</button>
      {wideCfg && <button className="sta-linkbtn" onClick={() => download(`${type}-columns-template.csv`, templateText(type, true))}>Template with one column per {wideCfg.colKey}</button>}
      {error && <div className="sta-error">{error}</div>}

      {sheet && (
        <>
          <div className="sta-note"><b>{file.name}</b>: {sheet.body.length} rows found. {ready.length} ready{bad.length ? `, ${bad.length} incomplete will be skipped` : ""}.</div>

          {wideCfg && (
            <div className="sta-tabs" style={{ marginTop: 8 }}>
              <button className={`sta-tab ${!wide ? "active" : ""}`} onClick={() => { setLayout("long"); setMap(autoMap(type, sheet.headers)); }}>One row for each entry</button>
              <button className={`sta-tab ${wide ? "active" : ""}`} onClick={() => { const mm = { ...map, [wideCfg.colKey]: -1, [wideCfg.valueKey]: -1 }; setMap(mm); setLayout("wide"); setCols(suggestWideColumns(type, sheet.headers, sheet.body, mm)); }}>One column for each {wideCfg.colKey}</button>
            </div>
          )}

          <div className="sta-section-title">Check the columns</div>
          <div className="sta-scroll">
            <table className="sta-table">
              <thead><tr><th>We need</th><th>Column in your file</th></tr></thead>
              <tbody>
                {shownFields.filter((f) => f.key !== "sectionLetter").map((f) => (
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
          {missingRequired.length > 0 && <div className="sta-error">Choose which column holds: {missingRequired.map((f) => f.label).join(", ")}.</div>}

          {wide && (
            <>
              <div className="sta-section-title">{wideCfg.label} (tick the ones to upload)</div>
              <div className="sta-scroll" style={{ maxHeight: 180 }}>
                {sheet.headers.map((h, i) => {
                  const taken = Object.entries(map).some(([k, v]) => v === i && k !== wideCfg.colKey);
                  if (taken || !h) return null;
                  return <label key={i} style={{ display: "block", fontSize: 14, padding: "2px 0" }}><input type="checkbox" checked={cols.includes(i)} onChange={() => toggleCol(i)} /> {h}</label>;
                })}
              </div>
              {!cols.length && <div className="sta-error">Tick at least one column.</div>}
            </>
          )}

          <div className="sta-section-title">First rows</div>
          <div className="sta-scroll">
            <table className="sta-table">
              <thead><tr><th>Row</th>{(wide ? fields : shownFields).filter((f) => f.key !== "sectionLetter").map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 5).map((r, n) => (
                  <tr key={n}>
                    <td>{r.row}</td>
                    {(wide ? fields : shownFields).filter((f) => f.key !== "sectionLetter").map((f) => <td key={f.key}>{r[f.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="sta-btn" style={{ marginTop: 14 }} disabled={!ready.length || !!busy || missingRequired.length > 0 || !wideReady || blocked} onClick={run}>
            {busy || `Upload ${ready.length} ${cfg.noun}`}
          </button>
        </>
      )}

      {result && (
        <>
          <div className="sta-note" style={{ color: "var(--sage)" }}><b>{result.imported}</b> {cfg.noun} saved{result.classes ? ` in ${result.classes} classes` : ""}{result.skipped.length ? `, ${result.skipped.length} skipped` : ""}.</div>
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

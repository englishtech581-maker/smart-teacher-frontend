import React, { useState, useEffect } from "react";
import { api } from "./api";

const BATCH = 250000; // characters sent to the server at a time

// The school's own textbooks. The text is read in the browser and stored, so lesson plans can be built from the book.
export default function BooksPanel({ canDeleteAll = true, userId }) {
  const [books, setBooks] = useState(null);
  const [f, setF] = useState({ title: "", grade: "", subject: "" });
  const [pasted, setPasted] = useState("");
  const [file, setFile] = useState(null);
  const [state, setState] = useState({ busy: false, text: "", error: "", ok: "" });
  const load = () => api.listBooks().then(setBooks).catch((e) => setState((s) => ({ ...s, error: e.message })));
  useEffect(() => { load(); }, []);

  async function upload() {
    setState({ busy: true, text: "Starting…", error: "", ok: "" });
    let bookId = null;
    try {
      let pages;
      if (file && /\.pdf$/i.test(file.name)) {
        const { readPdf } = await import("./pdfText.js");
        pages = await readPdf(file, (i, n) => setState((s) => ({ ...s, text: `Reading page ${i} of ${n}…` })));
      } else if (file) {
        pages = [await file.text()];
      } else {
        pages = [pasted];
      }
      const all = pages.join("\n\n");
      if (all.replace(/\s/g, "").length < 200) throw new Error("Almost no text could be read. A scanned PDF (photos of pages) has no text inside. Use a PDF made on a computer, or paste the text.");
      bookId = (await api.addBook(f)).id;
      let sent = 0, buf = "";
      const flush = async () => { if (buf.trim()) { await api.addBookText(bookId, buf); sent += buf.length; setState((s) => ({ ...s, text: `Saving… ${Math.round((sent / all.length) * 100)}%` })); buf = ""; } };
      for (const p of pages) { buf += p + "\n\n"; if (buf.length >= BATCH) await flush(); }
      await flush();
      setState({ busy: false, text: "", error: "", ok: `"${f.title}" is ready. Teachers can now choose it when planning a lesson.` });
      setF({ title: "", grade: "", subject: "" }); setPasted(""); setFile(null); load();
    } catch (e) {
      if (bookId) api.deleteBook(bookId).catch(() => {}); // do not leave half a book behind
      setState({ busy: false, text: "", error: e.message, ok: "" });
    }
  }

  async function del(b) { if (window.confirm(`Delete "${b.title}"?`)) { await api.deleteBook(b.id); load(); } }

  return (
    <div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>School books</h3>
        {books === null && !state.error && <div className="sta-loading">Loading…</div>}
        {books && books.length === 0 && <div className="sta-empty">No books yet. Add the books your school teaches from.</div>}
        {books && books.length > 0 && <table className="sta-table"><tbody>{books.map((b) => (
          <tr key={b.id}><td><b>{b.title}</b><div className="sta-small">{b.grade ? `Class ${b.grade}` : ""} {b.subject || ""} · {b.pieces} pieces of text</div></td>
            <td>{(canDeleteAll || b.added_by === userId) && <button className="sta-linkbtn" onClick={() => del(b)}>Delete</button>}</td></tr>
        ))}</tbody></table>}
      </div>
      <div className="sta-card">
        <h3 style={{ marginBottom: 10 }}>Add a book</h3>
        <span className="sta-label">Book title *</span>
        <input className="sta-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Mathematics 7, Punjab Textbook Board" />
        <div className="sta-grid2">
          <div><span className="sta-label">Class</span><input className="sta-input" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder="7" /></div>
          <div><span className="sta-label">Subject</span><input className="sta-input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Mathematics" /></div>
        </div>
        <span className="sta-label">The book file (PDF or text file)</span>
        <input className="sta-input" type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
        {!file && <>
          <span className="sta-label">…or paste the text of a chapter</span>
          <textarea className="sta-textarea" style={{ minHeight: 110 }} value={pasted} onChange={(e) => setPasted(e.target.value)} />
        </>}
        <button className="sta-btn" disabled={state.busy || !f.title.trim() || (!file && pasted.trim().length < 50)} onClick={upload}>{state.busy ? state.text : "Add the book"}</button>
        {state.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{state.ok}</div>}
        {state.error && <div className="sta-error">{state.error}</div>}
        <div className="sta-note">The text is read on this device and saved to your school only. A big book can take a minute. Books are used only to help plan lessons.</div>
      </div>
    </div>
  );
}

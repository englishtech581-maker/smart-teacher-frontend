import React, { useState } from "react";
import { api } from "./api";

// "Forgot password" and the page the emailed link opens.
export function ForgotForm({ onBack }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ busy: false, done: null, error: "" });
  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, done: null, error: "" });
    try { const r = await api.forgotPassword(email); setState({ busy: false, done: r, error: "" }); }
    catch (err) { setState({ busy: false, done: null, error: err.message }); }
  }
  return (
    <form className="sta-card" onSubmit={submit}>
      <h3 style={{ marginBottom: 6 }}>Forgot your password?</h3>
      <div className="sta-small" style={{ marginBottom: 12 }}>Type the email you use to log in. We will email you a link to choose a new password.</div>
      <span className="sta-label">Email</span>
      <input className="sta-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="sta-btn" disabled={state.busy || !email.trim()}>{state.busy ? "Please wait..." : "Send the link"}</button>
      {state.error && <div className="sta-error">{state.error}</div>}
      {state.done && state.done.mailReady && <div className="sta-note" style={{ color: "var(--sage)" }}>If an account with this email exists, a link has been sent. Check your inbox and spam folder. The link works for one hour.</div>}
      {state.done && !state.done.mailReady && <div className="sta-error">Email sending is not set up on this server yet, so no link could be sent. Please ask your school principal to give you a new password.</div>}
      <div style={{ marginTop: 12 }}><button type="button" className="sta-linkbtn" onClick={onBack}>← Back to log in</button></div>
      <div className="sta-note">Parents who log in with a phone number have no email, so please ask the school office for a new password.</div>
    </form>
  );
}

export function ResetForm({ token, onDone }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [state, setState] = useState({ busy: false, ok: false, error: "" });
  async function submit(e) {
    e.preventDefault();
    if (pw !== pw2) return setState({ busy: false, ok: false, error: "The two passwords are not the same." });
    setState({ busy: true, ok: false, error: "" });
    try { await api.resetPassword(token, pw); setState({ busy: false, ok: true, error: "" }); }
    catch (err) { setState({ busy: false, ok: false, error: err.message }); }
  }
  if (state.ok) return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 8 }}>Password changed</h3>
      <div className="sta-small" style={{ marginBottom: 12 }}>You can now log in with your new password.</div>
      <button className="sta-btn" onClick={onDone}>Go to log in</button>
    </div>
  );
  return (
    <form className="sta-card" onSubmit={submit}>
      <h3 style={{ marginBottom: 10 }}>Choose a new password</h3>
      <span className="sta-label">New password (at least 6 characters)</span>
      <input className="sta-input" type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
      <span className="sta-label">Type it again</span>
      <input className="sta-input" type="password" minLength={6} required value={pw2} onChange={(e) => setPw2(e.target.value)} />
      <button className="sta-btn" disabled={state.busy}>{state.busy ? "Please wait..." : "Save new password"}</button>
      {state.error && <div className="sta-error">{state.error}</div>}
    </form>
  );
}

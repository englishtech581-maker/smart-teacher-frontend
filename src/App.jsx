import React, { useState, useEffect } from "react";
import { api, getToken, getUser, setSession, clearSession } from "./api";
import TeacherApp from "./TeacherApp.jsx";
import AdminApp from "./AdminApp.jsx";
import ParentApp from "./ParentApp.jsx";

export default function App() {
  const [user, setUser] = useState(getUser());

  function handleAuthed(u) {
    setUser(u);
  }
  function handleLogout() {
    clearSession();
    setUser(null);
  }

  return (
    <div className="sta">
      <div className="sta-shell">
        {!user && <AuthScreen onAuthed={handleAuthed} />}
        {user && user.role === "teacher" && <TeacherApp user={user} onLogout={handleLogout} />}
        {user && user.role === "admin" && <AdminApp user={user} onLogout={handleLogout} />}
        {user && user.role === "parent" && <ParentApp user={user} onLogout={handleLogout} />}
      </div>
    </div>
  );
}

/* ---------- Auth ---------- */
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | register
  const [role, setRole] = useState("teacher");
  const [form, setForm] = useState({ name: "", email: "", password: "", schoolName: "", schoolId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [justRegisteredAdmin, setJustRegisteredAdmin] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (mode === "login") {
        result = await api.login({ email: form.email, password: form.password });
      } else {
        const payload = { name: form.name, email: form.email, password: form.password, role };
        if (role === "admin") payload.schoolName = form.schoolName;
        else payload.schoolId = form.schoolId;
        result = await api.register(payload);
      }
      setSession(result.token, result.user);
      if (mode === "register" && role === "admin") {
        setJustRegisteredAdmin(result.user);
      } else {
        onAuthed(result.user);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (justRegisteredAdmin) {
    return (
      <>
        <div className="sta-hero">
          <h1>School created 🎉</h1>
          <div className="underline" />
        </div>
        <div className="sta-card">
          <span className="sta-label">Your School ID — share this with teachers and parents so they can join</span>
          <div className="sta-schoolid">{justRegisteredAdmin.school_id}</div>
          <button className="sta-btn" style={{ marginTop: 14 }} onClick={() => onAuthed(justRegisteredAdmin)}>
            Continue to dashboard
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sta-hero">
        <h1>Smart Teacher &amp;<br />Institute Assistant</h1>
        <div className="underline" />
        <p>Lesson guides, performance tracking &amp; attendance — in one place.</p>
      </div>

      <div className="sta-authtabs">
        <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Log in</button>
        <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button>
      </div>

      <form className="sta-card" onSubmit={handleSubmit}>
        {mode === "register" && (
          <>
            <span className="sta-label">I am a</span>
            <div className="sta-role-pick">
              <button type="button" className={role === "teacher" ? "active" : ""} onClick={() => setRole("teacher")}>👩‍🏫 Teacher</button>
              <button type="button" className={role === "admin" ? "active" : ""} onClick={() => setRole("admin")}>🏫 Admin</button>
              <button type="button" className={role === "parent" ? "active" : ""} onClick={() => setRole("parent")}>👪 Parent</button>
            </div>
            <span className="sta-label">Your name</span>
            <input className="sta-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </>
        )}

        <span className="sta-label">{mode === "login" || role === "parent" ? "Email or phone number" : "Email"}</span>
        <input
          type={mode === "login" || role === "parent" ? "text" : "email"}
          className="sta-input"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder={mode === "register" && role === "parent" ? "e.g. 03001234567" : ""}
          required
        />

        <span className="sta-label">Password</span>
        <input type="password" className="sta-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />

        {mode === "register" && role === "admin" && (
          <>
            <span className="sta-label">School name</span>
            <input className="sta-input" value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} required />
          </>
        )}
        {mode === "register" && role !== "admin" && (
          <>
            <span className="sta-label">School ID (ask your school admin for this)</span>
            <input className="sta-input" value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })} required />
          </>
        )}

        <button className="sta-btn" disabled={loading} type="submit">
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>
        {error && <div className="sta-error">{error}</div>}
      </form>
    </>
  );
}

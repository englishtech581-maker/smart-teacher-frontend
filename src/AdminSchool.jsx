import React, { useState, useEffect } from "react";
import { api } from "./api";

const TYPES = ["Primary", "Middle", "High school", "Deeni madrassa", "Other"];

// Shrinks a photo in the browser before it is saved, so it stays small enough for the free database.
function shrink(file) {
  const tries = [[1280, 0.72], [1024, 0.6], [800, 0.5]];
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      for (const [max, quality] of tries) {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL("image/jpeg", quality);
        if (data.length < 800000) return resolve(data);
      }
      reject(new Error("This photo is too large. Please choose a smaller one."));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not a photo."));
    };
    img.src = url;
  });
}

export default function AdminSchool({ school, onSaved }) {
  const [form, setForm] = useState({ name: "", schoolType: "", genderType: "", city: "", phone: "" });
  const [photo, setPhoto] = useState(null); // a new photo chosen but not saved yet
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ ok: "", error: "" });

  useEffect(() => {
    if (school) setForm({ name: school.name || "", schoolType: school.school_type || "", genderType: school.gender_type || "", city: school.city || "", phone: school.phone || "" });
  }, [school]);

  async function choosePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setPhoto(await shrink(file));
      setMsg({ ok: "", error: "" });
    } catch (err) {
      setMsg({ ok: "", error: err.message });
    }
  }

  async function save() {
    setSaving(true);
    setMsg({ ok: "", error: "" });
    try {
      const payload = { name: form.name.trim(), schoolType: form.schoolType, genderType: form.genderType || undefined, city: form.city.trim(), phone: form.phone.trim() };
      if (photo) payload.photo = photo;
      const saved = await api.updateSchool(payload);
      onSaved(saved);
      setPhoto(null);
      setMsg({ ok: "Saved. Your school details and photo are updated.", error: "" });
    } catch (err) {
      const text = err.message === "Not found" ? "The server has not been updated yet. Finish piece 1 first." : err.message;
      setMsg({ ok: "", error: text || "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  const shown = photo || (school && school.photo);
  return (
    <div className="sta-card">
      <h3 style={{ marginBottom: 12 }}>School profile</h3>

      {shown ? <img className="sta-photo" src={shown} alt="Your school" /> : <div className="sta-empty">No school photo yet.</div>}
      <span className="sta-label">School photo (shown at the top of your dashboard)</span>
      <input className="sta-input" type="file" accept="image/*" onChange={choosePhoto} />
      {photo && <div className="sta-small" style={{ marginBottom: 12 }}>New photo ready. Press Save to keep it.</div>}

      <div className="sta-grid2">
        <div>
          <span className="sta-label">School name</span>
          <input className="sta-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <span className="sta-label">School type</span>
          <select className="sta-select" value={form.schoolType} onChange={(e) => setForm({ ...form, schoolType: e.target.value })}>
            <option value="">Choose</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <span className="sta-label">Who studies here</span>
          <select className="sta-select" value={form.genderType} onChange={(e) => setForm({ ...form, genderType: e.target.value })}>
            <option value="">Choose</option>
            <option value="boys">Boys only</option>
            <option value="girls">Girls only</option>
            <option value="coed">Co-education (boys and girls)</option>
          </select>
        </div>
        <div>
          <span className="sta-label">City</span>
          <input className="sta-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <span className="sta-label">School phone</span>
          <input className="sta-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>

      <button className="sta-btn" onClick={save} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : "Save"}</button>
      {msg.ok && <div className="sta-note" style={{ color: "var(--sage)" }}>{msg.ok}</div>}
      {msg.error && <div className="sta-error">{msg.error}</div>}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { api } from "./api";
import AdminDashboard from "./AdminDashboard.jsx";
import AdminSchool from "./AdminSchool.jsx";

// The principal's area. More tabs are added here as the school features arrive.
const TABS = [
  ["dash", "Dashboard"],
  ["school", "School"],
];

export default function AdminApp({ user, onLogout }) {
  const [tab, setTab] = useState("dash");
  const [school, setSchool] = useState(null);

  useEffect(() => {
    api.getSchool().then(setSchool).catch(() => {});
  }, []);

  const photo = school && school.photo;
  return (
    <>
      <div
        className="sta-banner"
        style={photo ? { backgroundImage: `linear-gradient(rgba(14,24,21,.35), rgba(14,24,21,.72)), url("${photo}")` } : undefined}
      >
        <div className="name">{school ? school.name : "Your school"}</div>
        <div className="who">
          Admin · {user.name}
          <button className="sta-logout" onClick={onLogout}>Log out</button>
        </div>
      </div>

      <div className="sta-tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`sta-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "dash" && <AdminDashboard user={user} />}
      {tab === "school" && <AdminSchool school={school} onSaved={setSchool} />}
    </>
  );
}

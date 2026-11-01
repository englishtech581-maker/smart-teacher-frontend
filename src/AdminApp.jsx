import React, { useState, useEffect } from "react";
import { api } from "./api";
import AdminDashboard from "./AdminDashboard.jsx";
import AdminStudents from "./AdminStudents.jsx";
import AdminStaff from "./AdminStaff.jsx";
import AdminSections from "./AdminSections.jsx";
import AdminSchool from "./AdminSchool.jsx";
import AdminExams from "./AdminExams.jsx";
import AdminFees from "./AdminFees.jsx";
import AdminHR from "./AdminHR.jsx";
import AdminTimetable from "./AdminTimetable.jsx";
import BooksPanel from "./BooksPanel.jsx";

// The principal's area. More tabs are added here as the school features arrive.
const TABS = [
  ["dash", "Dashboard"],
  ["students", "Students"],
  ["staff", "Staff"],
  ["classes", "Classes"],
  ["exams", "Exams"],
  ["fees", "Fees"],
  ["hr", "Staff HR"],
  ["time", "Timetable"],
  ["books", "Books"],
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
        className="sta-banner sta-noprint"
        style={photo ? { backgroundImage: `linear-gradient(rgba(14,24,21,.35), rgba(14,24,21,.72)), url("${photo}")` } : undefined}
      >
        <div className="name">{school ? school.name : "Your school"}</div>
        <div className="who">
          Admin · {user.name}
          <button className="sta-logout" onClick={onLogout}>Log out</button>
        </div>
      </div>

      <div className="sta-tabs sta-noprint">
        {TABS.map(([key, label]) => (
          <button key={key} className={`sta-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "dash" && <AdminDashboard user={user} />}
      {tab === "students" && <AdminStudents />}
      {tab === "staff" && <AdminStaff />}
      {tab === "classes" && <AdminSections user={user} />}
      {tab === "exams" && <AdminExams />}
      {tab === "fees" && <AdminFees />}
      {tab === "hr" && <AdminHR />}
      {tab === "time" && <AdminTimetable />}
      {tab === "books" && <BooksPanel userId={user.id} />}
      {tab === "school" && <AdminSchool school={school} onSaved={setSchool} />}
    </>
  );
}

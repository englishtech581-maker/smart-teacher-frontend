const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function getToken() {
  return localStorage.getItem("sta_token");
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("sta_user") || "null");
  } catch {
    return null;
  }
}
export function setSession(token, user) {
  localStorage.setItem("sta_token", token);
  localStorage.setItem("sta_user", JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem("sta_token");
  localStorage.removeItem("sta_user");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // auth
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),

  // classes
  createClass: (payload) => request("/classes", { method: "POST", body: payload }),
  listClasses: () => request("/classes"),
  updateClass: (classId, payload) => request(`/classes/${classId}`, { method: "PATCH", body: payload }),

  // students
  addStudent: (classId, payload) => request(`/classes/${classId}/students`, { method: "POST", body: payload }),
  listStudents: (classId) => request(`/classes/${classId}/students`),
  removeStudent: (classId, studentId) => request(`/classes/${classId}/students/${studentId}`, { method: "DELETE" }),

  // attendance
  markAttendance: (classId, payload) => request(`/classes/${classId}/attendance`, { method: "POST", body: payload }),
  getDayAttendance: (classId, date) => request(`/classes/${classId}/attendance?date=${date}`),
  getMonthlyAttendance: (classId, month) => request(`/classes/${classId}/attendance/monthly?month=${month}`),

  // performance
  addPerformance: (classId, payload) => request(`/classes/${classId}/performance`, { method: "POST", body: payload }),
  getLatestPerformance: (classId) => request(`/classes/${classId}/performance/latest`),

  // admin
  getDashboard: () => request("/admin/dashboard"),

  // parent
  getChildren: () => request("/parent/children"),

  // AI (proxied through the backend, which holds the API key)
  lessonGuide: (payload) => request("/ai/lesson-guide", { method: "POST", body: payload }),
  studentInsight: (payload) => request("/ai/student-insight", { method: "POST", body: payload }),
  parentReport: (payload) => request("/ai/parent-report", { method: "POST", body: payload }),
  riskBriefing: (payload) => request("/ai/risk-briefing", { method: "POST", body: payload }),
};

// ---- school structure, people and import ----
Object.assign(api, {
  getSchool: () => request("/school"),
  updateSchool: (p) => request("/school", { method: "PATCH", body: p }),
  getSections: () => request("/sections"),
  addSection: (p) => request("/sections", { method: "POST", body: p }),
  setClassTeacher: (id, classTeacherId) => request(`/sections/${id}`, { method: "PATCH", body: { classTeacherId } }),
  deleteSection: (id) => request(`/sections/${id}`, { method: "DELETE" }),
  getTeachers: () => request("/people/teachers"),
  listPeopleStudents: (q, sectionId) =>
    request(`/people/students?q=${encodeURIComponent(q || "")}${sectionId ? `&sectionId=${sectionId}` : ""}`),
  addPersonStudent: (p) => request("/people/students", { method: "POST", body: p }),
  deletePersonStudent: (id) => request(`/people/students/${id}`, { method: "DELETE" }),
  listStaff: () => request("/people/staff"),
  addStaff: (p) => request("/people/staff", { method: "POST", body: p }),
  deleteStaff: (id) => request(`/people/staff/${id}`, { method: "DELETE" }),
  importStudents: (rows) => request("/import/students", { method: "POST", body: { rows } }),
  importStaff: (rows) => request("/import/staff", { method: "POST", body: { rows } }),
});

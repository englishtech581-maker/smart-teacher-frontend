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

// ---- exams, fees, staff, timetable, homework, books ----
const qs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
Object.assign(api, {
  listExams: () => request("/exams"),
  createExam: (p) => request("/exams", { method: "POST", body: p }),
  deleteExam: (id) => request(`/exams/${id}`, { method: "DELETE" }),
  examSheet: (id, sectionId, subject) => request(`/exams/${id}/sheet?${qs({ sectionId, subject })}`),
  saveMarks: (id, p) => request(`/exams/${id}/marks`, { method: "PUT", body: p }),
  reportCard: (studentId, year) => request(`/exams/report-card/${studentId}?${qs({ year })}`),
  listActivities: (studentId) => request(`/exams/activities/${studentId}`),
  addActivity: (p) => request("/exams/activities", { method: "POST", body: p }),
  deleteActivity: (id) => request(`/exams/activities/${id}`, { method: "DELETE" }),

  generateFees: (p) => request("/fees/generate", { method: "POST", body: p }),
  feeLedger: (o) => request(`/fees/ledger?${qs(o)}`),
  feeSummary: (month) => request(`/fees/summary?${qs({ month })}`),
  payFee: (p) => request("/fees/payments", { method: "POST", body: p }),
  deleteCharge: (id) => request(`/fees/charges/${id}`, { method: "DELETE" }),

  staffAttendance: (date) => request(`/hr/attendance?${qs({ date })}`),
  saveStaffAttendance: (p) => request("/hr/attendance", { method: "POST", body: p }),
  staffAttendanceSummary: (month) => request(`/hr/attendance/summary?${qs({ month })}`),
  leaveList: () => request("/hr/leave"),
  addLeave: (p) => request("/hr/leave", { method: "POST", body: p }),
  setLeaveStatus: (id, status) => request(`/hr/leave/${id}`, { method: "PATCH", body: { status } }),
  myLeave: () => request("/hr/my-leave"),
  requestLeave: (p) => request("/hr/my-leave", { method: "POST", body: p }),
  setSalary: (staffId, base) => request(`/hr/salary/${staffId}`, { method: "PUT", body: { base } }),
  generatePayroll: (month) => request("/hr/payroll/generate", { method: "POST", body: { month } }),
  payroll: (month) => request(`/hr/payroll?${qs({ month })}`),
  updatePayroll: (id, p) => request(`/hr/payroll/${id}`, { method: "PATCH", body: p }),
  staffReviews: () => request("/hr/reviews"),
  addReview: (p) => request("/hr/reviews", { method: "POST", body: p }),

  getTimetable: (sectionId) => request(`/timetable?${qs({ sectionId })}`),
  saveTimetable: (p) => request("/timetable", { method: "PUT", body: p }),
  myTimetable: () => request("/timetable/mine"),

  postHomework: (p) => request("/homework", { method: "POST", body: p }),
  classHomework: (classId) => request(`/homework/class/${classId}`),
  deleteHomework: (id) => request(`/homework/${id}`, { method: "DELETE" }),

  listBooks: () => request("/books"),
  addBook: (p) => request("/books", { method: "POST", body: p }),
  addBookText: (id, text) => request(`/books/${id}/text`, { method: "POST", body: { text } }),
  deleteBook: (id) => request(`/books/${id}`, { method: "DELETE" }),

  childHomework: (id) => request(`/parent/child/${id}/homework`),
  childFees: (id) => request(`/parent/child/${id}/fees`),
  childTimetable: (id) => request(`/parent/child/${id}/timetable`),

  lessonChat: (p) => request("/ai/lesson-chat", { method: "POST", body: p }),
});

// ---- automatic fees ----
Object.assign(api, {
  autoSettings: () => request("/fees/auto/settings"),
  saveAutoSettings: (p) => request("/fees/auto/settings", { method: "PUT", body: p }),
  addFeePlan: (p) => request("/fees/auto/plans", { method: "POST", body: p }),
  deleteFeePlan: (id) => request(`/fees/auto/plans/${id}`, { method: "DELETE" }),
  runAutoFees: () => request("/fees/auto/run", { method: "POST" }),
  feeNotices: (pending) => request(`/fees/auto/notices${pending ? "?pending=1" : ""}`),
  markNotice: (id, waDone) => request(`/fees/auto/notices/${id}`, { method: "PATCH", body: { waDone } }),
  voucher: (studentId, month) => request(`/fees/voucher?${qs({ studentId, month })}`),
  vouchers: (month, sectionId) => request(`/fees/vouchers?${qs({ month, sectionId })}`),
  childVouchers: (id) => request(`/parent/child/${id}/vouchers`),
  childVoucher: (id, month) => request(`/parent/child/${id}/voucher?${qs({ month })}`),
});

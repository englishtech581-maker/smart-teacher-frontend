import * as XLSX from "xlsx";

// What can be imported, and how to recognise each column by its heading.
export const FIELDS = {
  students: [
    { key: "name", label: "Student name", re: /name|student|pupil/i, avoid: /father|mother|guardian|parent|school/i, required: true },
    { key: "admissionNo", label: "Admission no.", re: /adm|roll|reg(?!ion)|gr\s*no/i },
    { key: "sectionLetter", label: "Section (only if it is a separate column)", re: /^\s*sec(tion)?\s*$/i },
    { key: "className", label: "Class", re: /class|grade|std/i },
    { key: "gender", label: "Gender", re: /gender|sex/i },
    { key: "guardianName", label: "Guardian name", re: /(father|mother|guardian|parent).*name|^(father|guardian)$/i },
    { key: "parentPhone", label: "Parent phone", re: /phone|mobile|contact|cell|whatsapp/i },
    { key: "parentEmail", label: "Parent email", re: /mail/i },
  ],
  staff: [
    { key: "name", label: "Name", re: /name/i, avoid: /father|husband|spouse|guardian|school/i, required: true },
    { key: "role", label: "Role", re: /role|designation|post|position/i },
    { key: "department", label: "Department", re: /dep|subject/i },
    { key: "phone", label: "Phone", re: /phone|mobile|contact|cell|whatsapp/i },
    { key: "email", label: "Email", re: /mail/i },
    { key: "joinedOn", label: "Joined on", re: /join|since|hire|appoint|doj/i },
  ],
};

const pad = (n) => String(n).padStart(2, "0");
const SSF = XLSX.SSF || (XLSX.default && XLSX.default.SSF); // the library offers it under either name

// Text for one cell. Date cells are turned into 2017-04-01 straight from the stored date, so the day and
// the month can never be swapped. Typed text (and CSV files) is left exactly as written.
function cellText(cell) {
  if (!cell) return "";
  if (cell.t === "n" && cell.z && SSF && SSF.is_date(cell.z)) {
    const d = SSF.parse_date_code(cell.v);
    if (d) return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  if (cell.w !== undefined) return String(cell.w);
  return String(cell.v ?? "");
}

// Reads the first sheet. Many school files have a title above the headings,
// so the heading row is the first row with at least two filled cells.
export function readSheet(buf) {
  const wb = XLSX.read(buf, { type: "array", raw: true, cellNF: true }); // raw: CSV values are kept as typed
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = [];
  if (ws && ws["!ref"]) {
    const ref = XLSX.utils.decode_range(ws["!ref"]);
    const lastRow = Math.min(ref.e.r, ref.s.r + 20000);
    for (let r = ref.s.r; r <= lastRow; r++) {
      const row = [];
      for (let c = ref.s.c; c <= ref.e.c; c++) row.push(cellText(ws[XLSX.utils.encode_cell({ r, c })]));
      data.push(row);
    }
  }
  const h = data.findIndex((r) => r.filter((c) => String(c).trim()).length >= 2);
  if (h < 0) return { headers: [], body: [] };
  const headers = data[h].map((c) => String(c).trim());
  const body = [];
  data.slice(h + 1).forEach((r, i) => {
    if (r.some((c) => String(c).trim())) body.push({ row: h + i + 2, cells: r }); // row number as shown in Excel
  });
  return { headers, body };
}

// Guess which column of the file belongs to which field.
export function autoMap(type, headers) {
  const used = new Set();
  const map = {};
  for (const f of FIELDS[type]) {
    const i = headers.findIndex((x, k) => !used.has(k) && f.re.test(x) && !(f.avoid && f.avoid.test(x)));
    map[f.key] = i;
    if (i >= 0) used.add(i);
  }
  return map;
}

export function buildRows(type, body, map) {
  return body.map((b) => {
    const o = { row: b.row };
    for (const f of FIELDS[type]) o[f.key] = map[f.key] >= 0 ? String(b.cells[map[f.key]] ?? "").trim() : "";
    if (type === "students") {
      // "7" in one column and "A" in another becomes "7-A"
      if (o.sectionLetter && /^\s*(class|grade)?\s*\d+(st|nd|rd|th)?\s*$/i.test(o.className)) o.className = `${o.className}-${o.sectionLetter}`;
      delete o.sectionLetter;
    }
    return o;
  });
}

// ---------------------------------------------------------------------------------------------
// Uploads for the other tabs. Every type says which columns it understands, how to recognise
// them by heading, and where the rows are sent.
const ID = [
  { key: "admissionNo", label: "Admission no.", re: /adm|roll|reg(?!ion)|gr\s*no/i },
  { key: "name", label: "Student name", re: /name|student|pupil/i, avoid: /father|mother|guardian|parent|school|subject|teacher|fee|activity|event|title/i },
];
const CLS = { key: "className", label: "Class (for example 7-A)", re: /class|grade|std|section/i };
const needStudent = (r) => (r.admissionNo || r.name ? "" : "Admission number or student name is missing");

Object.assign(FIELDS, {
  sections: [
    { key: "className", label: "Class (for example 7-A)", re: /class|grade|std|section/i, required: true },
    { key: "classTeacher", label: "Class teacher (email or name)", re: /teacher|incharge|in-charge|mail/i },
  ],
  marks: [
    ...ID, CLS,
    { key: "subject", label: "Subject", re: /subject|course/i },
    { key: "marks", label: "Marks obtained", re: /mark|score|obtained|got/i, avoid: /total|max|out of/i },
    { key: "total", label: "Total marks (optional)", re: /total|max|out of/i },
  ],
  feeCharges: [
    ...ID,
    { key: "title", label: "Fee name (for example Tuition fee)", re: /fee|head|title|particular|description|type/i, avoid: /amount|date|month/i },
    { key: "month", label: "Month (for example Nov 2026)", re: /month|period|for/i },
    { key: "amount", label: "Amount", re: /amount|rs|pkr|charge|due/i, avoid: /date|month|name/i },
  ],
  feePayments: [
    ...ID,
    { key: "month", label: "Month the fee is for (optional)", re: /month|for/i },
    { key: "title", label: "Fee name (optional)", re: /fee|head|title|particular/i, avoid: /amount|date|month/i },
    { key: "amount", label: "Amount received", re: /amount|received|paid|pkr|rs/i, avoid: /date|method|mode|month|name/i },
    { key: "paidOn", label: "Date received", re: /date|paid on|received on/i },
    { key: "method", label: "Method (cash, bank…)", re: /method|mode|via|channel/i },
  ],
  staffAttendance: [
    { key: "name", label: "Staff name", re: /name/i, avoid: /father|school/i },
    { key: "phone", label: "Phone (optional)", re: /phone|mobile|contact|cell/i },
    { key: "email", label: "Email (optional)", re: /mail/i },
    { key: "date", label: "Date", re: /date|day/i },
    { key: "status", label: "Status (Present, Absent, Late, Leave)", re: /status|att|present/i },
  ],
  salary: [
    { key: "name", label: "Staff name", re: /name/i, avoid: /father|school/i },
    { key: "phone", label: "Phone (optional)", re: /phone|mobile|contact|cell/i },
    { key: "email", label: "Email (optional)", re: /mail/i },
    { key: "salary", label: "Monthly salary", re: /salary|pay|amount|wage|base/i },
  ],
  timetable: [
    { key: "className", label: "Class (for example 7-A)", re: /class|grade|std|section/i },
    { key: "day", label: "Day (Monday…Saturday)", re: /day/i },
    { key: "period", label: "Period (1 to 10)", re: /period|lecture|slot|no\b/i },
    { key: "subject", label: "Subject", re: /subject|course/i },
    { key: "teacher", label: "Teacher (email or name)", re: /teacher|staff|faculty/i },
  ],
  events: [
    { key: "title", label: "Event", re: /title|event|name|occasion|activity/i },
    { key: "kind", label: "Kind (holiday, exam, activity, meeting)", re: /kind|type|category/i },
    { key: "startDate", label: "First day", re: /start|from|begin|date/i, avoid: /end|till|until/i },
    { key: "endDate", label: "Last day (optional)", re: /end|till|until|^to$/i },
    { key: "details", label: "Details (optional)", re: /detail|note|desc|remark/i },
  ],
  announcements: [
    { key: "title", label: "Title", re: /title|subject|heading|notice/i },
    { key: "body", label: "Message", re: /body|message|text|detail|content/i },
    { key: "audience", label: "For (everyone, teachers, parents)", re: /audience|visible|for|who/i },
  ],
  activities: [
    ...ID, CLS,
    { key: "activity", label: "Activity", re: /activity|event|sport|club/i },
    { key: "category", label: "Category (Sports, Arts…)", re: /category|type|kind/i },
    { key: "marks", label: "Marks (optional)", re: /mark|score|obtained/i, avoid: /total|max|out of/i },
    { key: "total", label: "Out of (optional)", re: /total|max|out of/i },
    { key: "note", label: "Note (optional)", re: /note|remark|comment/i },
  ],
  attendance: [
    ...ID,
    { key: "date", label: "Date", re: /date|day/i },
    { key: "status", label: "Status (Present, Absent, Late, Leave)", re: /status|att|present/i },
  ],
});

const needAll = (...keys) => (r) => { const m = keys.find((k) => !r[k]); return m ? `${FIELDS_LABEL(m)} is missing` : ""; };
const FIELDS_LABEL = (k) => ({ className: "Class", title: "Title", name: "Name", month: "Month", amount: "Amount", date: "Date", status: "Status", salary: "Salary", activity: "Activity", subject: "Subject", marks: "Marks" }[k] || k);

const looksLikeDate = (h) => /^\d{4}-\d{1,2}-\d{1,2}$/.test(h) || /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(h);
const notSubject = /total|percent|%|grade|position|rank|result|remarks?|^s\.?\s*no|sr/i;

export const CONFIG = {
  students: { noun: "students", endpoint: "/import/students", sample: ["Ali Raza", "A-1021", "7-A", "M", "Raza Ahmed", "03001234567", ""], need: (r) => (r.name ? "" : "Name is missing") },
  staff: { noun: "staff members", endpoint: "/import/staff", sample: ["Ms Rabia", "Coordinator", "Primary", "03001234567", "", "2017-04-01"], need: (r) => (r.name ? "" : "Name is missing") },
  sections: { noun: "classes", endpoint: "/bulk/sections", sample: ["7-A", "teacher@school.pk"], need: needAll("className") },
  marks: {
    noun: "marks", endpoint: "/bulk/marks", needsExam: true, needsTotal: true,
    sample: ["A-1021", "Ali Raza", "7-A", "Maths", "86", ""],
    wide: { colKey: "subject", valueKey: "marks", label: "Subject columns", pick: (h) => h && !notSubject.test(h), numeric: true, sample: [["Admission no.", "Student name", "Maths", "English", "Urdu"], ["A-1021", "Ali Raza", "86", "74", "91"]] },
    need: (r) => needStudent(r) || (r.subject ? "" : "Subject is missing"),
  },
  feeCharges: { noun: "fees", endpoint: "/bulk/fee-charges", sample: ["A-1021", "Ali Raza", "Tuition fee", "Nov 2026", "3000"], need: (r) => needStudent(r) || needAll("month", "amount")(r) },
  feePayments: { noun: "payments", endpoint: "/bulk/fee-payments", sample: ["A-1021", "Ali Raza", "Nov 2026", "", "3000", "2026-11-05", "Cash"], need: (r) => needStudent(r) || needAll("amount")(r) },
  staffAttendance: { noun: "attendance records", endpoint: "/bulk/staff-attendance", sample: ["Ms Rabia", "", "", "2026-11-02", "Present"], need: (r) => (r.name || r.phone || r.email ? "" : "Name is missing") || needAll("date", "status")(r) },
  salary: { noun: "salaries", endpoint: "/bulk/salary", sample: ["Ms Rabia", "03001234567", "", "45000"], need: (r) => (r.name || r.phone || r.email ? "" : "Name is missing") || needAll("salary")(r) },
  timetable: { noun: "lessons", endpoint: "/bulk/timetable", single: true, sample: ["7-A", "Monday", "1", "Maths", "teacher@school.pk"], need: needAll("className", "day", "period", "subject"),
    warn: "Every class that appears in your file gets exactly the timetable in the file. Its old timetable is replaced." },
  events: { noun: "events", endpoint: "/bulk/events", sample: ["Eid holidays", "holiday", "2027-03-30", "2027-04-02", ""], need: needAll("title", "startDate") },
  announcements: { noun: "notices", endpoint: "/bulk/announcements", sample: ["Parent meeting", "Friday at 10 am in the hall", "parents"], need: needAll("title") },
  activities: { noun: "activity records", endpoint: "/bulk/activities", sample: ["A-1021", "Ali Raza", "7-A", "Debate", "Clubs", "8", "10", ""], need: (r) => needStudent(r) || needAll("activity")(r) },
  attendance: {
    noun: "attendance records", endpoint: "/bulk/attendance", single: false,
    sample: ["A-1021", "Ali Raza", "2026-11-02", "Present"],
    wide: { colKey: "date", valueKey: "status", label: "Date columns", pick: looksLikeDate, numeric: false, sample: [["Admission no.", "Student name", "2026-11-02", "2026-11-03"], ["A-1021", "Ali Raza", "P", "A"]] },
    need: (r) => needStudent(r) || needAll("date", "status")(r),
  },
};

// A file with one column per subject (or per date) is turned into one row per student per column.
export function suggestWideColumns(type, headers, body, map) {
  const w = CONFIG[type].wide;
  const used = new Set(Object.values(map).filter((i) => i >= 0));
  return headers.map((h, i) => i).filter((i) => {
    if (used.has(i) || !w.pick(headers[i])) return false;
    if (!w.numeric) return true;
    return body.slice(0, 30).some((b) => String(b.cells[i] ?? "").trim() !== "" && Number.isFinite(Number(String(b.cells[i]).replace(/,/g, ""))));
  });
}

export function buildWideRows(type, body, map, cols, headers) {
  const w = CONFIG[type].wide;
  const out = [];
  for (const b of body) {
    const base = { row: b.row };
    for (const f of FIELDS[type]) if (f.key !== w.colKey && f.key !== w.valueKey && f.key !== "total") base[f.key] = map[f.key] >= 0 ? String(b.cells[map[f.key]] ?? "").trim() : "";
    for (const c of cols) {
      const v = String(b.cells[c] ?? "").trim();
      if (v === "") continue; // an empty cell means "no entry", not zero
      out.push({ ...base, [w.colKey]: String(headers[c]).trim(), [w.valueKey]: v });
    }
  }
  return out;
}

export function templateText(type, wide) {
  const c = CONFIG[type];
  if (wide && c.wide) return c.wide.sample.map((r) => r.join(",")).join("\n") + "\n";
  const head = FIELDS[type].filter((f) => f.key !== "sectionLetter").map((f) => f.label).join(",");
  return `${head}\n${c.sample.join(",")}\n`;
}

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

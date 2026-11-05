// Offline support. Two jobs:
//  1. Remember what the server last said (class lists, students, timetable, marks sheets...) so the pages
//     still open without internet.
//  2. Keep attendance and exam marks that were entered offline, and send them when the internet is back.
// Everything lives in this browser's localStorage. A queued change is only ever sent for the person who made it.

const CACHE = "sta_c:";
const QUEUE = "sta_queue";
const MAX_ENTRY = 300 * 1024; // a single saved answer larger than this is not kept
const MAX_ENTRIES = 80;

let offlineNow = false;
const emit = () => { try { window.dispatchEvent(new CustomEvent("sta-sync")); } catch { /* not in a browser */ } };

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// ---------- saved server answers ----------
const uid = (user) => (user && user.id) || "anon";
const skipCache = (path) => /^\/(auth|owner)\b/.test(path);

export function cacheWrite(user, path, data) {
  if (skipCache(path)) return;
  let text;
  try { text = JSON.stringify({ t: Date.now(), d: data }); } catch { return; }
  if (text.length > MAX_ENTRY) return;
  const key = CACHE + uid(user) + "|" + path;
  if (!ls.set(key, text)) { evict(10); ls.set(key, text); }
  else if (Math.random() < 0.1) evict(0);
}
function cacheKeys() {
  const keys = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(CACHE)) keys.push(k); } } catch { /* ignore */ }
  return keys;
}
function evict(extra) {
  const items = cacheKeys().map((k) => { let t = 0; try { t = JSON.parse(ls.get(k)).t; } catch { /* broken entry */ } return { k, t }; }).sort((a, b) => a.t - b.t);
  const drop = Math.max(items.length - MAX_ENTRIES, 0) + extra;
  items.slice(0, drop).forEach((x) => ls.del(x.k));
}
export function cacheRead(user, path) {
  const raw = ls.get(CACHE + uid(user) + "|" + path);
  if (!raw) return undefined;
  try { return JSON.parse(raw).d; } catch { return undefined; }
}
export function clearCache() { cacheKeys().forEach((k) => ls.del(k)); }

// ---------- changes waiting to be sent ----------
function readQueue() { try { return JSON.parse(ls.get(QUEUE) || "[]"); } catch { return []; } }
function writeQueue(q) { ls.set(QUEUE, JSON.stringify(q)); emit(); }

// Which requests may be kept for later, and under what name. A newer save of the same thing replaces / merges the older one.
export function queueSpec(path, method, body) {
  let m;
  if (method === "POST" && (m = path.match(/^\/classes\/([^/]+)\/attendance$/)) && body && body.date) {
    return { key: `att|${m[1]}|${body.date}`, label: `Attendance of ${body.date}`, merge: "attendance" };
  }
  if (method === "PUT" && (m = path.match(/^\/exams\/([^/]+)\/marks$/)) && body && body.subject) {
    return { key: `marks|${m[1]}|${body.sectionId}|${body.subject}`, label: `${body.subject} marks`, merge: "replace" };
  }
  return null;
}

export function enqueue(user, path, method, body, spec) {
  const q = readQueue();
  const i = q.findIndex((e) => e.userId === uid(user) && e.key === spec.key);
  if (i >= 0) {
    const old = q[i];
    if (spec.merge === "attendance") {
      const by = new Map(old.body.records.map((r) => [r.studentId, r]));
      for (const r of body.records || []) by.set(r.studentId, r);
      old.body = { ...body, records: [...by.values()] };
    } else old.body = body;
    old.at = Date.now(); delete old.failed;
  } else {
    q.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), userId: uid(user), method, path, body, key: spec.key, label: spec.label, at: Date.now() });
  }
  writeQueue(q);
}

export function status(user) {
  const mine = readQueue().filter((e) => e.userId === uid(user));
  return {
    offline: offlineNow || (typeof navigator !== "undefined" && navigator.onLine === false),
    pending: mine.filter((e) => !e.failed).length,
    failed: mine.filter((e) => e.failed).map((e) => ({ id: e.id, label: e.label, reason: e.failed })),
  };
}
export function setOffline(v) { if (offlineNow !== v) { offlineNow = v; emit(); } }
export function discard(id) { writeQueue(readQueue().filter((e) => e.id !== id)); }

// Network trouble (as opposed to the server answering with an error).
export const isNetworkError = (err) => err && (err.name === "TypeError" || err.name === "AbortError");
export const OFFLINE_MESSAGE = "No internet connection right now. Please try again when you are online.";

let syncing = false;
// Sends the waiting changes in order. `send(entry)` must resolve with the HTTP status and any error text.
export async function syncQueue(user, send) {
  if (syncing) return;
  syncing = true;
  emit();
  try {
    for (const e of readQueue().filter((x) => x.userId === uid(user) && !x.failed)) {
      let r;
      try { r = await send(e); } catch { setOffline(true); break; }
      setOffline(false);
      if (r.status >= 200 && r.status < 300) { writeQueue(readQueue().filter((x) => x.id !== e.id)); continue; }
      if (r.status === 401 || r.status === 408 || r.status === 429 || r.status >= 500) break; // try again later
      writeQueue(readQueue().map((x) => (x.id === e.id ? { ...x, failed: r.error || `Refused (${r.status})` } : x)));
    }
  } finally { syncing = false; emit(); }
}

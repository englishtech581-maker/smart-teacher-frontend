export function computePerformance(quizPct, homeworkStatus, attendancePct) {
  const hwPoints = { Good: 3, Average: 2, Weak: 1, Missing: 0 }[homeworkStatus] ?? 1;
  const quizPoints = quizPct >= 80 ? 3 : quizPct >= 60 ? 2 : quizPct >= 40 ? 1 : 0;
  const attPoints = attendancePct >= 90 ? 3 : attendancePct >= 75 ? 2 : attendancePct >= 50 ? 1 : 0;
  const score = (hwPoints + quizPoints + attPoints) / 9;
  if (score >= 0.8) return "Excellent";
  if (score >= 0.6) return "Good";
  if (score >= 0.4) return "Needs Support";
  return "At Risk";
}
export function chipClass(p) {
  return { Excellent: "chip-exc", Good: "chip-good", "Needs Support": "chip-support", "At Risk": "chip-risk" }[p] || "chip-good";
}
export function suggestionFor(perf, topic) {
  const t = topic || "this topic";
  if (perf === "At Risk") return `Revise basic concepts of ${t} in a one-on-one or small-group session before moving to the next topic.`;
  if (perf === "Needs Support") return `Give extra practice questions on ${t} and recheck understanding before the next lesson.`;
  return null;
}
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
export function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

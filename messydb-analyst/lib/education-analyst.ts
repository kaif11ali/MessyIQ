export type EducationIntent = "overview" | "cohort" | "program" | "retention" | "leavers" | "graduation" | "at_risk";

export type StudentRow = {
  id: number;
  student_code: string;
  full_name: string;
  gender: string;
  program: string;
  cohort: number;
  admission_year: number;
  campus: string;
  academic_year: number;
  year_of_study: number;
  status: string;
  gpa: number | null;
  attendance_percent: number | null;
  fee_status: string;
  reason: string | null;
  event_date: string;
};

export type AnalysisMetric = {
  label: string;
  value: string;
  detail: string;
};

export type AnalysisResult = {
  intent: EducationIntent;
  answer: string;
  summary: string;
  metrics: AnalysisMetric[];
  rows: Array<Record<string, string | number>>;
  evidence: {
    sourceRows: number;
    latestStatusRows: number;
    dataQuality: number;
  };
  source: "demo" | "supabase";
};

const intentPatterns: Array<{ intent: EducationIntent; pattern: RegExp }> = [
  { intent: "graduation", pattern: /graduat|complet|degree|alumni/i },
  { intent: "leavers", pattern: /left|leave|leaver|withdraw|drop.?out|reason/i },
  { intent: "at_risk", pattern: /at.?risk|unpaid|fee|attendance|struggling/i },
  { intent: "program", pattern: /program/i },
  { intent: "cohort", pattern: /cohort|admission|admitted|campus|enroll/i },
  { intent: "retention", pattern: /retain|retention|active|current|status/i },
];

const blockedPatterns = [
  /\b(hate|racial|sexist|slurs?)\b/i,
  /\b(damn|hell|bitch|bastard|shit|fuck|asshole|idiot|moron)\b/i,
  /\b(how to hack|steal|bypass|exploit|destroy|delete)\b/i,
];

export function getIntent(question: string): EducationIntent {
  return intentPatterns.find(({ pattern }) => pattern.test(question))?.intent ?? "overview";
}

export function validateQuestion(question: string): string | null {
  const trimmed = question.trim();
  if (!trimmed) return "Please enter a question about the education data.";
  if (trimmed.length > 240) return "Please keep your question under 240 characters.";
  if (blockedPatterns.some((pattern) => pattern.test(trimmed))) {
    return "I cannot answer that request because it includes unsafe or abusive language. Please rephrase it as a respectful question about the student data.";
  }
  return null;
}

export function percentage(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 1000) / 10;
}

export function summarizeRows(rows: StudentRow[], intent: EducationIntent): AnalysisResult {
  const total = rows.length;
  const complete = rows.filter((row) =>
    row.gpa !== null && row.attendance_percent !== null && row.status && row.program,
  ).length;
  const statuses = countBy(rows, "status");
  const withLeave = rows.filter((row) => ["On Leave", "Withdrew", "Transfer Out"].includes(row.status));
  const graduates = rows.filter((row) => row.status === "Graduated");
  const atRisk = rows.filter((row) =>
    row.status !== "Graduated" &&
    (row.attendance_percent !== null && row.attendance_percent < 75 || row.fee_status !== "Paid"),
  );
  const active = rows.filter((row) => ["Admitted", "Enrolled", "Promoted"].includes(row.status));

  let metrics: AnalysisMetric[];
  let aggregateRows: Array<Record<string, string | number>>;
  let summary: string;

  if (intent === "leavers") {
    metrics = [
      { label: "Not in continuing study", value: String(withLeave.length), detail: `${percentage(withLeave.length, total)}% of latest statuses` },
      { label: "Withdrawals", value: String(statuses.Withdrew ?? 0), detail: "Recorded as withdrew" },
      { label: "With active leave", value: String(statuses["On Leave"] ?? 0), detail: "Medical, family or personal leave" },
    ];
    const reasonRows = countBy(withLeave.filter((row) => row.reason), (row) => row.reason ?? "Not recorded");
    aggregateRows = Object.entries(reasonRows)
      .map(([reason, count]) => ({ reason, students: count }))
      .sort((a, b) => Number(b.students) - Number(a.students));
    summary = `${withLeave.length} students have a latest status of leave, withdrawal or transfer. The most common recorded reason is ${aggregateRows[0]?.reason ?? "not recorded"}.`;
  } else if (intent === "graduation") {
    metrics = [
      { label: "Graduates", value: String(graduates.length), detail: "Latest status recorded" },
      { label: "Completion rate", value: `${percentage(graduates.length, total)}%`, detail: "Across all cohort statuses shown" },
      { label: "Cohort", value: String(Math.min(...rows.map((row) => row.cohort))), detail: "Earliest listed cohort" },
    ];
    aggregateRows = Object.entries(countBy(graduates, "program"))
      .map(([program, students]) => ({ program, graduates: students }))
      .sort((a, b) => Number(b.graduates) - Number(a.graduates));
    summary = `${graduates.length} of ${total} students have graduated. ${aggregateRows[0]?.program ?? "No program"} has the largest graduate count.`;
  } else if (intent === "at_risk") {
    metrics = [
      { label: "Needs attention", value: String(atRisk.length), detail: `${percentage(atRisk.length, total)}% of current records` },
      { label: "Below 75% attendance", value: String(rows.filter((row) => row.attendance_percent !== null && row.attendance_percent < 75).length), detail: "Not graduated" },
      { label: "Fees not fully paid", value: String(rows.filter((row) => row.fee_status !== "Paid").length), detail: "Partial or unpaid status" },
    ];
    aggregateRows = atRisk
      .slice(0, 8)
      .map((row) => ({ program: row.program, status: row.status, attendance: row.attendance_percent ?? 0, fees: row.fee_status }));
    summary = `${atRisk.length} students match at least one risk signal: attendance below 75% or fees that are not fully paid.`;
  } else if (intent === "program") {
    const programCounts = countBy(rows, "program");
    metrics = [
      { label: "Continuing study", value: String(active.length), detail: `${percentage(active.length, total)}% of student records` },
      { label: "Programs", value: String(Object.keys(programCounts).length), detail: "Across this dataset" },
      { label: "Graduated", value: String(graduates.length), detail: "Latest status recorded" },
    ];
    aggregateRows = Object.entries(programCounts)
      .map(([program, students]) => ({
        program,
        students,
        active: active.filter((row) => row.program === program).length,
      }))
      .sort((a, b) => b.students - a.students || a.program.localeCompare(b.program));
    summary = `${active.length} of ${total} students are in continuing study across ${Object.keys(programCounts).length} programs.`;
  } else if (intent === "cohort") {
    const cohorts = countBy(rows, "cohort");
    metrics = [
      { label: "Students", value: String(total), detail: "Latest status per person" },
      { label: "Cohorts", value: String(Object.keys(cohorts).length), detail: "Admission years represented" },
      { label: "Programs", value: String(Object.keys(countBy(rows, "program")).length), detail: "Across this dataset" },
    ];
    aggregateRows = Object.entries(cohorts)
      .map(([cohort, students]) => ({ cohort: Number(cohort), students }))
      .sort((a, b) => a.cohort - b.cohort);
    summary = `${total} students span ${Object.keys(cohorts).length} cohorts and ${Object.keys(countBy(rows, "program")).length} programs.`;
  } else {
    metrics = [
      { label: "Students", value: String(total), detail: "Latest record per person" },
      { label: "Currently active", value: String(active.length), detail: `${percentage(active.length, total)}% of student records` },
      { label: "Graduated", value: String(graduates.length), detail: `${percentage(graduates.length, total)}% completion` },
    ];
    aggregateRows = Object.entries(statuses)
      .map(([status, students]) => ({ status, students }))
      .sort((a, b) => Number(b.students) - Number(a.students));
    summary = `${total} student records are represented. ${active.length} remain in continuing study and ${graduates.length} have graduated.`;
  }

  return {
    intent,
    answer: summary,
    summary,
    metrics,
    rows: aggregateRows,
    evidence: {
      sourceRows: total,
      latestStatusRows: total,
      dataQuality: percentage(complete, total),
    },
    source: "demo",
  };
}

export function getDemoStudentRows(): StudentRow[] {
  const programs = ["Computer Science", "Business", "Education", "Nursing"];
  const statuses = ["Enrolled", "Promoted", "Admitted", "On Leave", "Withdrew", "Graduated"];
  const reasons = ["Family circumstances", "Financial pressure", "Health", null];

  return Array.from({ length: 120 }, (_, index) => {
    const status = statuses[index % statuses.length];
    const needsSupport = index % 11 === 0;
    return {
      id: index + 1,
      student_code: `ST-${String(index + 1).padStart(3, "0")}`,
      full_name: `Demo Student ${index + 1}`,
      gender: index % 2 === 0 ? "Female" : "Male",
      program: programs[index % programs.length],
      cohort: 2022 + (index % 4),
      admission_year: 2022 + (index % 4),
      campus: index % 3 === 0 ? "North" : index % 3 === 1 ? "Central" : "East",
      academic_year: 2025,
      year_of_study: 1 + (index % 4),
      status,
      gpa: needsSupport ? 1.8 : 2.2 + (index % 18) / 10,
      attendance_percent: needsSupport ? 68 : 78 + (index % 22),
      fee_status: index % 13 === 0 ? "Unpaid" : index % 7 === 0 ? "Partial" : "Paid",
      reason: status === "On Leave" || status === "Withdrew" ? reasons[index % reasons.length] : null,
      event_date: `2025-${String((index % 12) + 1).padStart(2, "0")}-15`,
    };
  });
}

function countBy<T>(rows: T[], keyOrGetter: keyof T | ((row: T) => string)): Record<string, number> {
  return rows.reduce<Record<string, number>>((result, row) => {
    const value = typeof keyOrGetter === "function" ? keyOrGetter(row) : String(row[keyOrGetter]);
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

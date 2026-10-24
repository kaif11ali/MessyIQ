import {
  getDemoStudentRows,
  type StudentRow,
} from "@/lib/education-analyst";

export type DashboardSource = "demo" | "supabase";

export type EducationDashboard = {
  source: DashboardSource;
  updatedAt: string;
  totals: {
    students: number;
    active: number;
    graduates: number;
    supportFlags: number;
    completionRate: number;
  };
  cohorts: Array<{ year: number; students: number }>;
  programs: Array<{ name: string; students: number; active: number }>;
  statuses: Array<{ name: string; students: number }>;
};

const activeStatuses = new Set(["Admitted", "Enrolled", "Promoted"]);

export async function getEducationRows(): Promise<{
  rows: StudentRow[];
  source: DashboardSource;
}> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url && !key) {
    return { rows: getDemoStudentRows(), source: "demo" };
  }

  if (!url || !key) {
    throw new Error("Supabase configuration is incomplete. Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const response = await fetch(
    `${url.replace(/\/+$/, "")}/rest/v1/education_student_overview?select=id,student_code,full_name,gender,program,cohort,admission_year,campus,academic_year,year_of_study,status,gpa,attendance_percent,fee_status,reason,event_date&order=cohort.asc,full_name.asc`,
    {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.error("Supabase education read failed", response.status);
    throw new Error("The education data could not be read. Verify the migration and Supabase server credentials.");
  }

  const rows = await response.json() as StudentRow[];
  if (!Array.isArray(rows)) {
    throw new Error("Supabase returned an unexpected education data format.");
  }
  return { rows, source: "supabase" };
}

export function buildEducationDashboard(
  rows: StudentRow[],
  source: DashboardSource,
): EducationDashboard {
  const active = rows.filter((row) => activeStatuses.has(row.status));
  const graduates = rows.filter((row) => row.status === "Graduated");
  const supportFlags = rows.filter((row) =>
    row.status !== "Graduated" &&
    ((row.attendance_percent !== null && row.attendance_percent < 75) || row.fee_status !== "Paid"),
  );

  return {
    source,
    updatedAt: new Date().toISOString(),
    totals: {
      students: rows.length,
      active: active.length,
      graduates: graduates.length,
      supportFlags: supportFlags.length,
      completionRate: rows.length === 0 ? 0 : Math.round((graduates.length / rows.length) * 1000) / 10,
    },
    cohorts: countStudents(rows, (row) => row.cohort)
      .map(([year, students]) => ({ year: Number(year), students }))
      .sort((a, b) => a.year - b.year),
    programs: countStudents(rows, (row) => row.program)
      .map(([name, students]) => ({
        name,
        students,
        active: active.filter((row) => row.program === name).length,
      }))
      .sort((a, b) => b.students - a.students || a.name.localeCompare(b.name)),
    statuses: countStudents(rows, (row) => row.status)
      .map(([name, students]) => ({ name, students }))
      .sort((a, b) => b.students - a.students || a.name.localeCompare(b.name)),
  };
}

function countStudents(
  rows: StudentRow[],
  getKey: (row: StudentRow) => string | number,
): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(getKey(row));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()];
}

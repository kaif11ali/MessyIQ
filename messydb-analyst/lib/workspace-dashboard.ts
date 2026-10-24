import { buildEducationDashboard, getEducationRows } from "@/lib/education-dashboard";
import {
  buildDomainDashboard,
  getDomainDefinition,
  getOrganizationRecords,
  isWorkspaceDomain,
  type WorkspaceDashboard,
} from "@/lib/organization-analytics";

export async function getWorkspaceDashboard(domainName: string): Promise<WorkspaceDashboard> {
  if (!isWorkspaceDomain(domainName)) throw new Error("Choose a supported workspace category.");

  if (domainName !== "education") {
    const { rows, source } = await getOrganizationRecords(domainName);
    return buildDomainDashboard(domainName, rows, source);
  }

  const { rows, source } = await getEducationRows();
  return mapEducationDashboard(buildEducationDashboard(rows, source));
}

export function mapEducationDashboard(
  education: ReturnType<typeof buildEducationDashboard>,
): WorkspaceDashboard {
  const definition = getDomainDefinition("education");
  return {
    domain: "education",
    ...definition,
    source: education.source,
    updatedAt: education.updatedAt,
    totals: {
      records: education.totals.students,
      active: education.totals.active,
      completed: education.totals.graduates,
      review: education.totals.supportFlags,
      completionRate: education.totals.completionRate,
    },
    groups: education.programs.map(({ name, students, active }) => ({ name, records: students, active })),
    statuses: education.statuses.map(({ name, students }) => ({ name, records: students })),
    periods: education.cohorts.map(({ year, students }) => ({ year, records: students })),
  };
}

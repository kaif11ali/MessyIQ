export const workspaceDomains = ["education", "retail", "workforce", "operations"] as const;
export type WorkspaceDomain = typeof workspaceDomains[number];
export type DataSource = "demo" | "supabase";

export type OrganizationRecord = {
  domain: Exclude<WorkspaceDomain, "education">;
  record_ref: string;
  segment: string;
  status: string;
  period_year: number;
  metric_value: number | null;
  review_signal: string;
  documented_reason: string | null;
};

export type WorkspaceDashboard = {
  domain: WorkspaceDomain;
  domainLabel: string;
  unit: string;
  activeLabel: string;
  completedLabel: string;
  reviewLabel: string;
  segmentLabel: string;
  source: DataSource;
  updatedAt: string;
  totals: {
    records: number;
    active: number;
    completed: number;
    review: number;
    completionRate: number;
  };
  groups: Array<{ name: string; records: number; active: number }>;
  statuses: Array<{ name: string; records: number }>;
  periods: Array<{ year: number; records: number }>;
};

export type DomainAnalysis = {
  answer: string;
  summary: string;
  metrics: Array<{ label: string; value: string; detail: string }>;
  rows: Array<Record<string, string | number>>;
  evidence: { sourceRows: number; latestStatusRows: number; dataQuality: number };
  source: DataSource;
  safeguard: string;
};

const definitions = {
  education: {
    domainLabel: "Education",
    unit: "students",
    activeLabel: "Continuing study",
    completedLabel: "Graduated",
    reviewLabel: "Support signals",
    segmentLabel: "Programs",
  },
  retail: {
    domainLabel: "Retail",
    unit: "orders",
    activeLabel: "In progress",
    completedLabel: "Fulfilled",
    reviewLabel: "Follow-up signals",
    segmentLabel: "Product groups",
  },
  workforce: {
    domainLabel: "Workforce",
    unit: "engagement records",
    activeLabel: "Active engagements",
    completedLabel: "Completed engagements",
    reviewLabel: "Human follow-ups",
    segmentLabel: "Departments",
  },
  operations: {
    domainLabel: "Operations",
    unit: "work orders",
    activeLabel: "Open work",
    completedLabel: "Resolved work",
    reviewLabel: "Review signals",
    segmentLabel: "Facilities",
  },
} satisfies Record<WorkspaceDomain, Omit<WorkspaceDashboard, "domain" | "source" | "updatedAt" | "totals" | "groups" | "statuses" | "periods">>;

export function isWorkspaceDomain(value: string): value is WorkspaceDomain {
  return workspaceDomains.some((domain) => domain === value);
}

export function getDomainDefinition(domain: WorkspaceDomain) {
  return definitions[domain];
}

export async function getOrganizationRecords(
  domain: Exclude<WorkspaceDomain, "education">,
): Promise<{ rows: OrganizationRecord[]; source: DataSource }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url && !key) return { rows: getDemoOrganizationRecords(domain), source: "demo" };
  if (!url || !key) {
    throw new Error("Supabase setup is incomplete. Configure both server-only Supabase values.");
  }

  const params = new URLSearchParams({
    select: "domain,record_ref,segment,status,period_year,metric_value,review_signal,documented_reason",
    domain: `eq.${domain}`,
    order: "period_year.asc",
  });
  const response = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/messyiq_demo_records?${params}`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Supabase domain read failed", domain, response.status);
    throw new Error("The selected domain data could not be read. Check that the multi-domain migration has been applied.");
  }
  const rows = await response.json() as OrganizationRecord[];
  if (!Array.isArray(rows)) throw new Error("Supabase returned an unexpected domain data format.");
  return { rows, source: "supabase" };
}

export function buildDomainDashboard(
  domain: Exclude<WorkspaceDomain, "education">,
  rows: OrganizationRecord[],
  source: DataSource,
): WorkspaceDashboard {
  const activeStatuses = domain === "retail"
    ? new Set(["Processing"])
    : domain === "workforce"
      ? new Set(["Active", "On Leave"])
      : new Set(["Open", "In Progress"]);
  const completedStatuses = domain === "retail"
    ? new Set(["Fulfilled"])
    : domain === "workforce"
      ? new Set(["Completed"])
      : new Set(["Resolved", "Closed"]);
  const active = rows.filter((row) => activeStatuses.has(row.status));
  const completed = rows.filter((row) => completedStatuses.has(row.status));
  const review = rows.filter((row) => row.review_signal !== "none");

  return {
    domain,
    ...definitions[domain],
    source,
    updatedAt: new Date().toISOString(),
    totals: {
      records: rows.length,
      active: active.length,
      completed: completed.length,
      review: review.length,
      completionRate: rows.length ? Math.round((completed.length / rows.length) * 1000) / 10 : 0,
    },
    groups: countBy(rows, (row) => row.segment)
      .map(([name, records]) => ({
        name,
        records,
        active: active.filter((row) => row.segment === name).length,
      }))
      .sort((a, b) => b.records - a.records || a.name.localeCompare(b.name)),
    statuses: countBy(rows, (row) => row.status)
      .map(([name, records]) => ({ name, records }))
      .sort((a, b) => b.records - a.records || a.name.localeCompare(b.name)),
    periods: countBy(rows, (row) => row.period_year)
      .map(([year, records]) => ({ year: Number(year), records }))
      .sort((a, b) => a.year - b.year),
  };
}

export function summarizeDomainQuestion(
  domain: Exclude<WorkspaceDomain, "education">,
  rows: OrganizationRecord[],
  source: DataSource,
  question: string,
): DomainAnalysis {
  const dashboard = buildDomainDashboard(domain, rows, source);
  const questionText = question.toLowerCase();
  const completedStatuses = domain === "retail"
    ? new Set(["Fulfilled"])
    : domain === "workforce"
      ? new Set(["Completed"])
      : new Set(["Resolved", "Closed"]);
  const activeStatuses = domain === "retail"
    ? new Set(["Processing"])
    : domain === "workforce"
      ? new Set(["Active", "On Leave"])
      : new Set(["Open", "In Progress"]);

  let matchingRows = rows;
  let scopeLabel = "all recorded";
  if (domain === "retail" && /\b(returns?|returned|refunds?)\b/.test(questionText)) {
    matchingRows = rows.filter((row) => row.status === "Returned" || row.review_signal === "refund_requested");
    scopeLabel = "return or refund follow-up";
  } else if (domain === "workforce" && /\b(exit|exited|departure|left|leaving)\b/.test(questionText)) {
    matchingRows = rows.filter((row) => row.status === "Exited");
    scopeLabel = "recorded exits";
  } else if (domain === "workforce" && /\b(leave|on leave)\b/.test(questionText)) {
    matchingRows = rows.filter((row) => row.status === "On Leave");
    scopeLabel = "recorded leave";
  } else if (domain === "operations" && /\bsafety\b/.test(questionText)) {
    matchingRows = rows.filter((row) => row.review_signal === "safety_review");
    scopeLabel = "safety review signals";
  } else if (/\b(open|processing|active|current|in progress)\b/.test(questionText)) {
    matchingRows = rows.filter((row) => activeStatuses.has(row.status));
    scopeLabel = "active records";
  } else if (/\b(completed|fulfilled|resolved|closed)\b/.test(questionText)) {
    matchingRows = rows.filter((row) => completedStatuses.has(row.status));
    scopeLabel = "completed records";
  }

  const wantsReasons = /\b(reason|why|cause|follow.?up|review|exit)\b/.test(questionText);
  const reasonCounts = wantsReasons
    ? countBy(matchingRows.filter((row) => row.documented_reason), (row) => row.documented_reason ?? "Not recorded")
      .map(([reason, records]) => ({ documented_reason: reason, records }))
      .sort((a, b) => b.records - a.records)
    : [];
  const matchingGroups = countBy(matchingRows, (row) => row.segment)
    .map(([name, records]) => ({ name, records }))
    .sort((a, b) => b.records - a.records || a.name.localeCompare(b.name));
  const aggregateRows: Array<Record<string, string | number>> = reasonCounts.length
    ? reasonCounts
    : matchingGroups.map((group) => ({ segment: group.name, records: group.records }));
  const countDescription = `${matchingRows.length} ${source === "demo" ? "synthetic " : ""}${dashboard.unit}${scopeLabel === "all recorded" ? "" : ` matching ${scopeLabel}`}`;
  const summary = wantsReasons
    ? `${countDescription} have ${reasonCounts.length ? "documented reasons summarized below; groups under five records are withheld" : "no documented reason in the available records"}.`
    : `${countDescription} across ${matchingGroups.length} ${dashboard.segmentLabel.toLowerCase()}.`;

  return {
    answer: `${summary}${source === "demo" ? " This is not an organization's live data." : ""}`,
    summary,
    metrics: [
      { label: `Matching ${dashboard.unit}`, value: String(matchingRows.length), detail: scopeLabel },
      { label: dashboard.activeLabel, value: String(dashboard.totals.active), detail: "Based on recorded status" },
      { label: dashboard.reviewLabel, value: String(dashboard.totals.review), detail: "Review signals are not decisions" },
    ],
    rows: aggregateRows,
    evidence: {
      sourceRows: rows.length,
      latestStatusRows: rows.length,
      dataQuality: 100,
    },
    source,
    safeguard: "Signals and documented reasons are context for a qualified human review, not a finding, score, blacklist, or automated decision about a person.",
  };
}

export function getDemoOrganizationRecords(
  domain: Exclude<WorkspaceDomain, "education">,
): OrganizationRecord[] {
  const retailSegments = ["Books", "Home", "Clothing", "Electronics", "Food"];
  const workforceSegments = ["Operations", "Customer Care", "Technology", "Finance", "Facilities"];
  const operationsSegments = ["North Campus", "Central Hub", "West Depot", "South Office"];
  const reasons = {
    retail: ["Carrier delay recorded", "Refund request recorded", "Payment follow-up recorded"],
    workforce: ["Leave request recorded for human review", "Contract ended", "Role transition recorded", "Personal departure recorded"],
    operations: ["Safety inspection requested", "Replacement parts delayed", "Scheduled inspection due"],
  };

  return Array.from({ length: 45 }, (_, index) => {
    const i = index + 1;
    if (domain === "retail") {
      const status = ["Processing", "Fulfilled", "Returned", "Cancelled"][(i - 1) % 4];
      const signal = i % 9 === 0 ? "delivery_delay" : i % 11 === 0 ? "refund_requested" : i % 13 === 0 ? "payment_follow_up" : "none";
      return {
        domain,
        record_ref: `DEMO-ORD-${String(i).padStart(4, "0")}`,
        segment: retailSegments[(i - 1) % retailSegments.length],
        status,
        period_year: 2024 + (i % 3),
        metric_value: 19 + ((i * 37) % 480),
        review_signal: signal,
        documented_reason: signal === "none" ? null : reasons.retail[signal === "delivery_delay" ? 0 : signal === "refund_requested" ? 1 : 2],
      };
    }
    if (domain === "workforce") {
      const status = ["Active", "On Leave", "Completed", "Exited"][(i - 1) % 4];
      const signal = status === "On Leave" ? "support_requested" : status === "Exited" ? "exit_follow_up" : i % 10 === 0 ? "schedule_change" : "none";
      const reasonIndex = status === "On Leave" ? 0 : status === "Exited" ? (i - 1) % 3 + 1 : -1;
      return {
        domain,
        record_ref: `DEMO-WRK-${String(i).padStart(4, "0")}`,
        segment: workforceSegments[(i - 1) % workforceSegments.length],
        status,
        period_year: 2024 + (i % 3),
        metric_value: null,
        review_signal: signal,
        documented_reason: reasonIndex < 0 ? null : reasons.workforce[reasonIndex],
      };
    }
    const status = ["Open", "In Progress", "Resolved", "Closed"][(i - 1) % 4];
    const signal = i % 12 === 0 ? "safety_review" : i % 7 === 0 ? "parts_delay" : i % 10 === 0 ? "inspection_due" : "none";
    const reasonIndex = signal === "safety_review" ? 0 : signal === "parts_delay" ? 1 : 2;
    return {
      domain,
      record_ref: `DEMO-OPS-${String(i).padStart(4, "0")}`,
      segment: operationsSegments[(i - 1) % operationsSegments.length],
      status,
      period_year: 2024 + (i % 3),
      metric_value: null,
      review_signal: signal,
      documented_reason: signal === "none" ? null : reasons.operations[reasonIndex],
    };
  });
}

function countBy<T>(rows: T[], getKey: (row: T) => string | number): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(getKey(row));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()];
}

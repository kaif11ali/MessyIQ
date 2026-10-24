import { NextRequest, NextResponse } from "next/server";
import {
  getIntent,
  summarizeRows,
  validateQuestion,
} from "@/lib/education-analyst";
import { getEducationRows } from "@/lib/education-dashboard";
import {
  getOrganizationRecords,
  isWorkspaceDomain,
  summarizeDomainQuestion,
} from "@/lib/organization-analytics";

const humanReviewNotice = "MessyIQ cannot blacklist, ban, expel, terminate, rank, or label a person as good or bad. It can summarize verified records, but a qualified human must review context, policy, and evidence before any consequential decision.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question : "";
  const domainName = typeof body?.domain === "string" ? body.domain : "education";
  const policyError = validateQuestion(question);
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });
  if (!isWorkspaceDomain(domainName)) {
    return NextResponse.json({ error: "Choose a supported workspace category." }, { status: 400 });
  }

  if (asksForIndividualConsequentialDecision(question)) {
    return NextResponse.json({
      answer: humanReviewNotice,
      answerType: "human_review_required",
      metrics: [],
      rows: [],
      evidence: { sourceRows: 0, latestStatusRows: 0, dataQuality: 0 },
      source: "none",
      safeguard: humanReviewNotice,
    });
  }

  try {
    if (domainName !== "education") {
      const { rows, source } = await getOrganizationRecords(domainName);
      const analysis = summarizeDomainQuestion(domainName, rows, source, question);
      const safeRows = suppressSmallGroups(analysis.rows);
      const generated = await writeAnalystAnswer("category aggregates", analysis.summary, analysis.metrics, safeRows);
      return NextResponse.json({ ...analysis, ...generated, rows: safeRows });
    }

    const { rows, source } = await getEducationRows();
    const analysis = summarizeRows(rows, getIntent(question));
    const groupedRows = analysis.intent === "at_risk"
      ? aggregateSupportSignals(rows)
      : analysis.rows;
    const safeRows = suppressSmallGroups(groupedRows);
    const safeguard = "Aggregate summaries only. Attendance, fee, leave, or conduct information is not a verdict about a student; a qualified person should review records and context.";
    const verifiedSummary = source === "demo"
      ? `Synthetic demo dataset. ${analysis.summary}`
      : analysis.summary;
    const generated = await writeAnalystAnswer(analysis.intent, verifiedSummary, analysis.metrics, safeRows);
    return NextResponse.json({
      ...analysis,
      ...generated,
      rows: safeRows,
      source,
      safeguard,
    });
  } catch (error) {
    console.error("Analyst data read failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The selected workspace data could not be read." },
      { status: 502 },
    );
  }
}

function asksForIndividualConsequentialDecision(question: string): boolean {
  const asksForAction = /\b(blacklist(?:ed|ing)?|black list|ban(?:ned|ning)?|expel(?:led|ling)?|terminat(?:e|ed|ion|ing)|fire(?:d|ing)?|punish(?:ed|ment|ing)?|good or bad|rank(?:ed|ing)?|good|bad|risky|dangerous)\b/i.test(question);
  const asksForIdentity = /\b(who is|name(?:d)?|student id|student code|employee id|specific person|this person|record\s*(?:id|ref|code)|(?:student|employee|customer)\s+(?:st-|demo-|id\b|code\b)|(?:st-\d{3,4}|demo-(?:ord|wrk|ops)-\d{4}))\b/i.test(question);
  const singularRecordLookup = /\b(this|that|named|specific|individual|one)\s+(student|employee|applicant|customer|person)\b/i.test(question);
  const namedOrPronounPerson = /\b(she|he|her|him|they|them)\b/i.test(question)
    || /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/.test(question)
    || /\b(?:is|should|can|did|does|why|about)\s+(?!this\b|that\b|a\b|an\b|the\b|all\b|students?\b|employees?\b|customers?\b|people\b)[A-Z][a-z]{2,}\b/.test(question);
  return asksForIdentity || singularRecordLookup || (asksForAction && (singularRecordLookup || namedOrPronounPerson));
}

function suppressSmallGroups(rows: Array<Record<string, string | number>>) {
  const countKeys = ["students", "graduates", "records"];
  const withheld: Array<Record<string, string | number>> = [];
  let withheldCount = 0;
  const visible = rows.filter((row) => {
    const countKey = countKeys.find((key) => typeof row[key] === "number");
    if (!countKey || Number(row[countKey]) >= 5) return true;
    withheld.push(row);
    withheldCount += Number(row[countKey]);
    return false;
  });
  if (withheldCount > 0) {
    const countKey = countKeys.find((key) => typeof withheld[0][key] === "number") ?? "records";
    const labelKey = Object.keys(withheld[0]).find((key) => key !== countKey) ?? "group";
    visible.push({ [labelKey]: "Small groups withheld", [countKey]: withheldCount });
  }
  return visible;
}

function aggregateSupportSignals(rows: Awaited<ReturnType<typeof getEducationRows>>["rows"]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.status === "Graduated") continue;
    const hasSignal = (row.attendance_percent !== null && row.attendance_percent < 75) || row.fee_status !== "Paid";
    if (!hasSignal) continue;
    const key = `${row.program} · ${row.status}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([group, records]) => ({ group, records }))
    .sort((a, b) => b.records - a.records);
}

async function writeAnalystAnswer(
  focus: string,
  summary: string,
  metrics: Array<{ label: string; value: string; detail: string }>,
  rows: Array<Record<string, string | number>>,
): Promise<{ answer: string; aiNotice?: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { answer: summary, aiNotice: "Groq is not configured. Showing the verified data summary." };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        temperature: 0.15,
        max_completion_tokens: 180,
        messages: [
          {
            role: "system",
            content: "You are MessyIQ, a careful multi-industry data analyst. Explain only the aggregate verified facts supplied. Never invent facts, infer motives, or make decisions about a person. Do not recommend blacklisting, banning, expelling, hiring, firing, terminating, or disciplining anyone. Say clearly when data is synthetic or limited. Keep the answer under 90 words.",
          },
          {
            role: "user",
            content: `Analysis focus: ${focus}\nVerified aggregate metrics: ${JSON.stringify(metrics)}\nVerified aggregate rows (groups under five records suppressed): ${JSON.stringify(rows)}\nSummary: ${summary}`,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Groq answer generation failed", response.status);
      return { answer: summary, aiNotice: "Groq is temporarily unavailable or over quota. Showing the verified summary instead." };
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const answer = payload.choices?.[0]?.message?.content?.trim();
    return answer
      ? { answer }
      : { answer: summary, aiNotice: "Groq returned no explanation. Showing the verified summary instead." };
  } catch (error) {
    console.error("Groq analysis failed", error);
    return { answer: summary, aiNotice: "Groq is temporarily unavailable. Showing the verified summary instead." };
  }
}

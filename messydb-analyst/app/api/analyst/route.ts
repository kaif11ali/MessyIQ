import { NextRequest, NextResponse } from "next/server";
import {
  getIntent,
  summarizeRows,
  validateQuestion,
  type AnalysisResult,
} from "@/lib/education-analyst";
import { getEducationRows } from "@/lib/education-dashboard";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question : "";
  const policyError = validateQuestion(question);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  const intent = getIntent(question);

  try {
    const { rows, source } = await getEducationRows();
    const analysis = summarizeRows(rows, intent);
    const generated = source === "supabase"
      ? await writePoliteAnswer(question, analysis)
      : { answer: `${analysis.summary} This is a deterministic demo dataset; connect Supabase for live student evidence.`, aiNotice: undefined };
    return NextResponse.json({ ...analysis, ...generated, source });
  } catch (error) {
    console.error("Supabase analyst read failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The education data could not be read." },
      { status: 502 },
    );
  }
}

async function writePoliteAnswer(
  question: string,
  analysis: AnalysisResult,
): Promise<{ answer: string; aiNotice?: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { answer: analysis.summary, aiNotice: "AI explanation is not configured; showing the verified summary." };

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
            content:
              "You are MessyIQ, a respectful education analyst. Explain only the verified aggregate facts supplied. Never invent students, dates, causes, or exact counts. Keep the answer under 90 words. Call limitations or missing data when relevant.",
          },
          {
            role: "user",
            content: `Question: ${question}\nVerified metrics: ${JSON.stringify(analysis.metrics)}\nVerified aggregate rows: ${JSON.stringify(analysis.rows)}\nEvidence: ${JSON.stringify(analysis.evidence)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Groq answer generation failed", response.status);
      return { answer: analysis.summary, aiNotice: "AI explanation is temporarily unavailable; showing the verified summary." };
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return {
      answer: payload.choices?.[0]?.message?.content?.trim() || analysis.summary,
      aiNotice: payload.choices?.[0]?.message?.content?.trim() ? undefined : "AI returned no explanation; showing the verified summary.",
    };
  } catch (error) {
    console.error("Groq analysis failed", error);
    return { answer: analysis.summary, aiNotice: "AI explanation is temporarily unavailable; showing the verified summary." };
  }
}

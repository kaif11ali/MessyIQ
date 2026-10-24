import { NextResponse } from "next/server";

type ConnectionCheck = {
  configured: boolean;
  connected: boolean;
  message: string;
};

export async function POST() {
  const [supabase, groq] = await Promise.all([checkSupabase(), checkGroq()]);
  return NextResponse.json({ supabase, groq }, { headers: { "Cache-Control": "no-store" } });
}

async function checkSupabase(): Promise<ConnectionCheck> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      configured: false,
      connected: false,
      message: "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    };
  }

  try {
    const response = await fetch(
      `${url.replace(/\/+$/, "")}/rest/v1/messyiq_demo_records?select=domain&limit=1`,
      {
        headers: { apikey: key, authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (response.ok) {
      return { configured: true, connected: true, message: "Supabase responded to a read-only data check." };
    }
    console.error("Supabase connection check failed", response.status);
    return {
      configured: true,
      connected: false,
      message: response.status === 404
        ? "The connection worked, but the multi-domain migration is not applied."
        : "Supabase did not accept the check. Verify project URL and service-role credentials.",
    };
  } catch (error) {
    console.error("Supabase connection check failed", error);
    return { configured: true, connected: false, message: "Supabase could not be reached. Check the URL and network." };
  }
}

async function checkGroq(): Promise<ConnectionCheck> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return {
      configured: false,
      connected: false,
      message: "Add GROQ_API_KEY to .env.local to enable AI explanations.",
    };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        max_completion_tokens: 8,
        messages: [{ role: "user", content: "Reply only with OK." }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      await response.body?.cancel();
      return { configured: true, connected: true, message: "Groq accepted a minimal connectivity check." };
    }
    console.error("Groq connection check failed", response.status);
    return {
      configured: true,
      connected: false,
      message: response.status === 429
        ? "Groq credentials are configured, but the account is over quota or rate limited."
        : response.status === 401
          ? "Groq rejected the key. Verify the key and selected model."
          : `Groq check failed with HTTP ${response.status}. Verify model access and account status.`,
    };
  } catch (error) {
    console.error("Groq connection check failed", error);
    return { configured: true, connected: false, message: "Groq could not be reached. Check the network and try again." };
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceDashboard } from "@/lib/workspace-dashboard";

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain") ?? "education";
  try {
    const dashboard = await getWorkspaceDashboard(domain);
    return NextResponse.json(dashboard, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Workspace dashboard could not load", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The workspace dashboard could not load." },
      { status: error instanceof Error && error.message.startsWith("Choose") ? 400 : 502 },
    );
  }
}

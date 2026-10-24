import { NextResponse } from "next/server";
import { buildEducationDashboard, getEducationRows } from "@/lib/education-dashboard";

export async function GET() {
  try {
    const { rows, source } = await getEducationRows();
    return NextResponse.json(buildEducationDashboard(rows, source), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Education dashboard could not load", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The education dashboard could not load." },
      { status: 502 },
    );
  }
}

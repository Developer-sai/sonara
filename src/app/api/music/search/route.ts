import { NextRequest, NextResponse } from "next/server";
import { universalSearch } from "@/lib/musicProviders";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || "";
    if (!q.trim()) return NextResponse.json({ results: [], correctedQuery: null });
    const { results, correctedQuery } = await universalSearch(q, 24);
    return NextResponse.json({ results, correctedQuery });
  } catch (err) {
    console.error("[music/search]", err);
    return NextResponse.json({ results: [], error: "Search failed, try again." }, { status: 500 });
  }
}

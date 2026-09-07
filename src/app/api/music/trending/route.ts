import { NextRequest, NextResponse } from "next/server";
import { getTrending } from "@/lib/musicProviders";

const ALLOWED_COUNTRIES = new Set([
  "us", "gb", "in", "au", "ca", "de", "fr", "jp", "br", "mx", "kr", "es", "it",
]);

export async function GET(req: NextRequest) {
  try {
    const requested = (req.nextUrl.searchParams.get("country") || "us").toLowerCase();
    const country = ALLOWED_COUNTRIES.has(requested) ? requested : "us";
    const trending = await getTrending(country);
    return NextResponse.json(trending);
  } catch (err) {
    console.error("[music/trending]", err);
    return NextResponse.json(
      { trending: [], error: "Couldn't load trending songs right now." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { DEMO_SETS } from "@/lib/musicProviders";

export async function GET() {
  return NextResponse.json({
    sets: DEMO_SETS.map((s) => ({
      slug: s.slug,
      title: s.title,
      description: s.description,
      trackCount: s.tracks.length,
    })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { buildDemoSet } from "@/lib/musicProviders";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await buildDemoSet(slug);
    if (!result) {
      return NextResponse.json({ error: "Demo set not found." }, { status: 404 });
    }
    return NextResponse.json({ set: result.def, items: result.items });
  } catch (err) {
    console.error("[music/demo-sets/:slug]", err);
    return NextResponse.json({ error: "Couldn't load that demo set." }, { status: 500 });
  }
}

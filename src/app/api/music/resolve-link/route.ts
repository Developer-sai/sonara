import { NextRequest, NextResponse } from "next/server";
import { resolveLink } from "@/lib/musicProviders";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = String(body.url || "");
    if (!url) {
      return NextResponse.json({ error: "No link provided." }, { status: 400 });
    }
    const result = await resolveLink(url);
    if (!result.song) {
      return NextResponse.json({ error: result.error || "Couldn't resolve that link." }, { status: 422 });
    }
    return NextResponse.json({ song: result.song });
  } catch (err) {
    console.error("[music/resolve-link]", err);
    return NextResponse.json({ error: "Something went wrong resolving that link." }, { status: 500 });
  }
}

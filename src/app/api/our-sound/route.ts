import { NextRequest, NextResponse } from "next/server";
import type { Song } from "@/lib/types";

function key(s: Song) {
  return `${s.title.trim().toLowerCase()}::${s.artist.trim().toLowerCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const a: Song[] = Array.isArray(body.a) ? body.a : [];
    const b: Song[] = Array.isArray(body.b) ? body.b : [];

    if (a.length === 0 || b.length === 0) {
      return NextResponse.json(
        { error: "Add songs to both sides before blending your sound." },
        { status: 400 }
      );
    }

    const bKeys = new Map(b.map((s) => [key(s), s]));
    const shared: Song[] = [];
    const onlyA: Song[] = [];

    for (const song of a) {
      const match = bKeys.get(key(song));
      if (match) {
        shared.push(song);
        bKeys.delete(key(song));
      } else {
        onlyA.push(song);
      }
    }
    const onlyB = Array.from(bKeys.values());

    const totalUnique = shared.length + onlyA.length + onlyB.length;
    const harmonyScore = totalUnique === 0 ? 0 : Math.round((shared.length / totalUnique) * 100);

    const blended: Song[] = [
      ...shared,
      ...interleave(onlyA, onlyB),
    ].slice(0, 24);

    return NextResponse.json({
      shared,
      onlyA,
      onlyB,
      blended,
      harmonyScore,
    });
  } catch (err) {
    console.error("[our-sound]", err);
    return NextResponse.json({ error: "Couldn't blend your sound right now." }, { status: 500 });
  }
}

function interleave(a: Song[], b: Song[]) {
  const out: Song[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

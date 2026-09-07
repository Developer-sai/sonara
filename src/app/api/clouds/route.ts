import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql, ensureDb, nowIso } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { customAlphabet } from "nanoid";
import type { CanvasElement, Cloud, Song } from "@/lib/types";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

function rowToCloud(row: Record<string, unknown>, items: Song[]): Cloud {
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? null,
    title: row.title as string,
    subtitle: (row.subtitle as string) ?? null,
    aspectRatio: row.aspect_ratio as Cloud["aspectRatio"],
    theme: JSON.parse((row.theme_json as string) || "{}"),
    elements: JSON.parse((row.elements_json as string) || "[]"),
    items,
    isPublic: Boolean(row.is_public),
    shareSlug: (row.share_slug as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSong(i: Record<string, unknown>): Song {
  return {
    id: i.id as string,
    title: i.title as string,
    artist: i.artist as string,
    album: (i.album as string) ?? null,
    artworkUrl: (i.artwork_url as string) ?? "",
    provider: i.provider as Song["provider"],
    externalUrl: (i.external_url as string) ?? null,
    previewUrl: (i.preview_url as string) ?? null,
    durationMs: (i.duration_ms as number) ?? null,
    rank: (i.rank as number) ?? null,
    genre: (i.genre as string) ?? null,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ clouds: [] });

  await ensureDb();
  const rows = (await sql`
    SELECT * FROM clouds WHERE user_id = ${user.id} ORDER BY updated_at DESC
  `) as Record<string, unknown>[];

  const clouds = await Promise.all(
    rows.map(async (row) => {
      const items = (await sql`
        SELECT * FROM cloud_items WHERE cloud_id = ${row.id as string} ORDER BY item_order ASC
      `) as Record<string, unknown>[];
      return rowToCloud(row, items.map(rowToSong));
    })
  );

  return NextResponse.json({ clouds });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to save a cloud." }, { status: 401 });
    }
    const body = await req.json();
    const {
      title = "",
      subtitle = null,
      aspectRatio = "9:16",
      theme = {},
      items = [],
      elements = [],
      isPublic = false,
    } = body as Partial<Cloud> & { items: Song[]; elements: CanvasElement[] };

    await ensureDb();
    const id = randomUUID();
    const shareSlug = isPublic ? nanoid() : null;
    const now = nowIso();

    await sql`
      INSERT INTO clouds (id, user_id, title, subtitle, aspect_ratio, theme_json, elements_json, is_public, share_slug, created_at, updated_at)
      VALUES (${id}, ${user.id}, ${title}, ${subtitle}, ${aspectRatio}, ${JSON.stringify(theme)}, ${JSON.stringify(elements)}, ${isPublic ? 1 : 0}, ${shareSlug}, ${now}, ${now})
    `;

    await Promise.all(
      items.map((song, idx) =>
        sql`
          INSERT INTO cloud_items (id, cloud_id, title, artist, album, artwork_url, provider, external_url, preview_url, duration_ms, item_order, rank, genre, added_at)
          VALUES (${randomUUID()}, ${id}, ${song.title}, ${song.artist}, ${song.album ?? null}, ${song.artworkUrl ?? null}, ${song.provider ?? "manual"}, ${song.externalUrl ?? null}, ${song.previewUrl ?? null}, ${song.durationMs ?? null}, ${idx}, ${song.rank ?? null}, ${song.genre ?? null}, ${now})
        `
      )
    );

    const rows = (await sql`SELECT * FROM clouds WHERE id = ${id}`) as Record<string, unknown>[];
    return NextResponse.json({ cloud: rowToCloud(rows[0], items.map((s, idx) => ({ ...s, rank: idx }))) });
  } catch (err) {
    console.error("[clouds] POST", err);
    return NextResponse.json({ error: "Couldn't save your cloud." }, { status: 500 });
  }
}

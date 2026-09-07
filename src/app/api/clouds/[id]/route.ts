import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql, ensureDb, nowIso } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { customAlphabet } from "nanoid";
import type { Song } from "@/lib/types";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  await ensureDb();
  const rows = (await sql`SELECT * FROM clouds WHERE id = ${id}`) as Record<string, unknown>[];
  const row = rows[0];
  if (!row || (row.user_id !== user?.id && !row.is_public)) {
    return NextResponse.json({ error: "Cloud not found." }, { status: 404 });
  }
  const items = await sql`
    SELECT * FROM cloud_items WHERE cloud_id = ${id} ORDER BY item_order ASC
  `;
  return NextResponse.json({ cloud: row, items });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { id } = await params;
    await ensureDb();

    const existingRows = (await sql`SELECT * FROM clouds WHERE id = ${id}`) as Record<
      string,
      unknown
    >[];
    const existing = existingRows[0];
    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Cloud not found." }, { status: 404 });
    }

    const body = await req.json();
    const title: string = body.title ?? (existing.title as string);
    const subtitle: string | null = body.subtitle ?? (existing.subtitle as string | null);
    const aspectRatio: string = body.aspectRatio ?? (existing.aspect_ratio as string);
    const theme: string = body.theme ? JSON.stringify(body.theme) : (existing.theme_json as string);
    const elements: string = body.elements
      ? JSON.stringify(body.elements)
      : (existing.elements_json as string);
    const isPublic: boolean = body.isPublic ?? Boolean(existing.is_public);
    let shareSlug: string | null = existing.share_slug as string | null;
    if (isPublic && !shareSlug) shareSlug = nanoid();
    if (!isPublic) shareSlug = null;
    const updatedAt = nowIso();

    await sql`
      UPDATE clouds
      SET title=${title}, subtitle=${subtitle}, aspect_ratio=${aspectRatio}, theme_json=${theme},
          elements_json=${elements}, is_public=${isPublic ? 1 : 0}, share_slug=${shareSlug}, updated_at=${updatedAt}
      WHERE id=${id}
    `;

    if (Array.isArray(body.items)) {
      // Preserve each song's original added_at across the delete+reinsert
      // (items are matched by title+artist) so a resave doesn't reset a
      // song's place in "added this week/month/year" history.
      const prevItems = (await sql`
        SELECT title, artist, added_at FROM cloud_items WHERE cloud_id = ${id}
      `) as { title: string; artist: string; added_at: string }[];
      const addedAtByKey = new Map(
        prevItems.map((p) => [`${p.title}::${p.artist}`, p.added_at])
      );
      const now = updatedAt;

      await sql`DELETE FROM cloud_items WHERE cloud_id = ${id}`;
      await Promise.all(
        (body.items as Song[]).map((song, idx) => {
          const addedAt = addedAtByKey.get(`${song.title}::${song.artist}`) || now;
          return sql`
            INSERT INTO cloud_items (id, cloud_id, title, artist, album, artwork_url, provider, external_url, preview_url, duration_ms, item_order, rank, genre, added_at)
            VALUES (${randomUUID()}, ${id}, ${song.title}, ${song.artist}, ${song.album ?? null}, ${song.artworkUrl ?? null}, ${song.provider ?? "manual"}, ${song.externalUrl ?? null}, ${song.previewUrl ?? null}, ${song.durationMs ?? null}, ${idx}, ${song.rank ?? null}, ${song.genre ?? null}, ${addedAt})
          `;
        })
      );
    }

    const rows = (await sql`SELECT * FROM clouds WHERE id = ${id}`) as Record<string, unknown>[];
    const row = rows[0];
    const items = (await sql`
      SELECT * FROM cloud_items WHERE cloud_id = ${id} ORDER BY item_order ASC
    `) as Record<string, unknown>[];
    return NextResponse.json({
      cloud: {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        subtitle: row.subtitle,
        aspectRatio: row.aspect_ratio,
        theme: JSON.parse((row.theme_json as string) || "{}"),
        elements: JSON.parse((row.elements_json as string) || "[]"),
        items: items.map((i) => ({
          id: i.id,
          title: i.title,
          artist: i.artist,
          album: i.album,
          artworkUrl: i.artwork_url,
          provider: i.provider,
          externalUrl: i.external_url,
          previewUrl: i.preview_url,
          durationMs: i.duration_ms,
          rank: i.rank,
          genre: i.genre ?? null,
        })),
        isPublic: Boolean(row.is_public),
        shareSlug: row.share_slug,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error("[clouds/:id] PATCH", err);
    return NextResponse.json({ error: "Couldn't update your cloud." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  await ensureDb();
  const result = await sql`
    DELETE FROM clouds WHERE id = ${id} AND user_id = ${user.id} RETURNING id
  `;
  if (result.length === 0) {
    return NextResponse.json({ error: "Cloud not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

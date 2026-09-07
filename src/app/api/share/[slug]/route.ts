import { NextRequest, NextResponse } from "next/server";
import { sql, ensureDb } from "@/lib/db";
import type { Song } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  await ensureDb();
  const rows = (await sql`
    SELECT clouds.*, users.username, users.avatar as owner_avatar
    FROM clouds
    JOIN users ON users.id = clouds.user_id
    WHERE share_slug = ${slug} AND is_public = 1
  `) as Record<string, unknown>[];
  const row = rows[0];

  if (!row) {
    return NextResponse.json({ error: "This cloud isn't available." }, { status: 404 });
  }

  const items = (await sql`
    SELECT * FROM cloud_items WHERE cloud_id = ${row.id as string} ORDER BY item_order ASC
  `) as Record<string, unknown>[];

  const songs: Song[] = items.map((i) => ({
    id: i.id as string,
    title: i.title as string,
    artist: i.artist as string,
    album: (i.album as string) ?? null,
    artworkUrl: (i.artwork_url as string) ?? "",
    provider: i.provider as Song["provider"],
    externalUrl: (i.external_url as string) ?? null,
    previewUrl: (i.preview_url as string) ?? null,
    durationMs: (i.duration_ms as number) ?? null,
    genre: (i.genre as string) ?? null,
  }));

  return NextResponse.json({
    cloud: {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      aspectRatio: row.aspect_ratio,
      theme: JSON.parse((row.theme_json as string) || "{}"),
      elements: JSON.parse((row.elements_json as string) || "[]"),
      items: songs,
      ownerUsername: row.username,
      ownerAvatar: row.owner_avatar,
      createdAt: row.created_at,
    },
  });
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql, ensureDb } from "@/lib/db";
import type { Cloud, Song } from "@/lib/types";
import ShareViewer from "@/components/share/ShareViewer";

async function loadCloud(slug: string): Promise<Cloud | null> {
  await ensureDb();
  const rows = (await sql`
    SELECT clouds.*, users.username, users.avatar as owner_avatar
    FROM clouds JOIN users ON users.id = clouds.user_id
    WHERE share_slug = ${slug} AND is_public = 1
  `) as Record<string, unknown>[];
  const row = rows[0];
  if (!row) return null;

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
  }));

  return {
    id: row.id as string,
    title: row.title as string,
    subtitle: (row.subtitle as string) ?? null,
    aspectRatio: row.aspect_ratio as Cloud["aspectRatio"],
    theme: JSON.parse((row.theme_json as string) || "{}"),
    elements: JSON.parse((row.elements_json as string) || "[]"),
    items: songs,
    isPublic: true,
    shareSlug: slug,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    ownerUsername: row.username as string,
    ownerAvatar: (row.owner_avatar as string) ?? null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cloud = await loadCloud(slug);
  if (!cloud) return { title: "Cloud not found" };
  return {
    title: `${cloud.title} — @${cloud.ownerUsername}`,
    description: `A SONARA music aura by @${cloud.ownerUsername} — ${cloud.items.length} songs.`,
    openGraph: {
      title: `${cloud.title} — @${cloud.ownerUsername}`,
      description: `A SONARA music aura featuring ${cloud.items.map((s) => s.title).join(", ")}`,
      images: cloud.items[0]?.artworkUrl ? [cloud.items[0].artworkUrl] : undefined,
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cloud = await loadCloud(slug);
  if (!cloud) notFound();

  return <ShareViewer cloud={cloud} />;
}

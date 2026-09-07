import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql, ensureDb } from "@/lib/db";
import {
  fetchSpotifyTopArtists,
  fetchSpotifyTopTracks,
  refreshSpotifyToken,
  type SpotifyTimeRange,
} from "@/lib/accountProviders";
import { PROVIDER_META, type MusicProvider, type Song } from "@/lib/types";

type Range = "week" | "month" | "year" | "all";
const VALID_RANGES: Range[] = ["week", "month", "year", "all"];

const RANGE_LABEL: Record<Range, string> = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
  all: "All Time",
};

const SPOTIFY_RANGE_MAP: Record<Range, SpotifyTimeRange> = {
  week: "short_term",
  month: "short_term",
  year: "long_term",
  all: "long_term",
};

function rangeStartDate(range: Range): Date | null {
  const now = new Date();
  if (range === "week") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "month") return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  if (range === "year") return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  return null;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to see your Wrapped." }, { status: 401 });
  }

  const rawRange = req.nextUrl.searchParams.get("range") || "year";
  const range: Range = (VALID_RANGES as string[]).includes(rawRange) ? (rawRange as Range) : "year";
  const startDate = rangeStartDate(range);

  await ensureDb();

  // ---- Sonara-native history: every song across every saved cloud ----
  const cloudRows = (await sql`
    SELECT id, created_at FROM clouds WHERE user_id = ${user.id}
  `) as { id: string; created_at: string }[];

  const nativeSongs: Song[] = [];
  const itemLists = await Promise.all(
    cloudRows.map((cloud) => sql`SELECT * FROM cloud_items WHERE cloud_id = ${cloud.id}`)
  );
  cloudRows.forEach((cloud, idx) => {
    const items = itemLists[idx] as Record<string, unknown>[];
    for (const i of items) {
      const addedAtRaw = (i.added_at as string) || cloud.created_at;
      if (startDate && new Date(addedAtRaw) < startDate) continue;
      nativeSongs.push({
        id: i.id as string,
        title: i.title as string,
        artist: i.artist as string,
        album: (i.album as string) ?? null,
        artworkUrl: (i.artwork_url as string) ?? "",
        provider: (i.provider as MusicProvider) ?? "manual",
        externalUrl: (i.external_url as string) ?? null,
        previewUrl: (i.preview_url as string) ?? null,
        durationMs: (i.duration_ms as number) ?? null,
        genre: (i.genre as string) ?? null,
      });
    }
  });

  // ---- Real Spotify listening data, if connected ----
  let spotifyConnected = false;
  let spotifyTopSongs: Song[] = [];
  let spotifyTopArtists: { name: string; genres: string[]; image: string | null }[] = [];

  const accountRows = (await sql`
    SELECT * FROM connected_accounts WHERE user_id = ${user.id} AND provider = 'spotify'
  `) as Record<string, unknown>[];
  const account = accountRows[0];

  if (account && account.mode === "oauth" && account.access_token) {
    spotifyConnected = true;
    let accessToken = account.access_token as string;
    const expiresAt = account.expires_at ? new Date(account.expires_at as string) : null;
    const isExpired = !expiresAt || expiresAt.getTime() < Date.now() + 60_000;

    if (isExpired && account.refresh_token) {
      const refreshed = await refreshSpotifyToken(account.refresh_token as string);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();
        await sql`
          UPDATE connected_accounts
          SET access_token = ${refreshed.accessToken}, refresh_token = ${refreshed.refreshToken}, expires_at = ${newExpiresAt}
          WHERE id = ${account.id as string}
        `;
      }
    }

    const spotifyRange = SPOTIFY_RANGE_MAP[range];
    [spotifyTopSongs, spotifyTopArtists] = await Promise.all([
      fetchSpotifyTopTracks(accessToken, spotifyRange, 25),
      fetchSpotifyTopArtists(accessToken, spotifyRange, 12),
    ]);
  }

  // ---- Blend & dedupe (real Spotify listening ranks first) ----
  const seen = new Set<string>();
  const blended: Song[] = [];
  for (const s of [...spotifyTopSongs, ...nativeSongs]) {
    const key = `${s.title.toLowerCase()}::${s.artist.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    blended.push(s);
  }

  const genreCounts = new Map<string, number>();
  for (const s of blended) {
    if (s.genre) genreCounts.set(s.genre, (genreCounts.get(s.genre) || 0) + 1);
  }
  for (const a of spotifyTopArtists) {
    for (const g of a.genres) {
      const label = g.replace(/\b\w/g, (c) => c.toUpperCase());
      genreCounts.set(label, (genreCounts.get(label) || 0) + 1);
    }
  }
  const genreBreakdown = Array.from(genreCounts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  let topArtists: { name: string; count: number; image: string | null }[];
  if (spotifyTopArtists.length) {
    topArtists = spotifyTopArtists.map((a, i) => ({
      name: a.name,
      count: spotifyTopArtists.length - i,
      image: a.image,
    }));
  } else {
    const artistCounts = new Map<string, number>();
    for (const s of blended) artistCounts.set(s.artist, (artistCounts.get(s.artist) || 0) + 1);
    topArtists = Array.from(artistCounts.entries())
      .map(([name, count]) => ({ name, count, image: null }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  const providerCounts = new Map<MusicProvider, number>();
  for (const s of blended) providerCounts.set(s.provider, (providerCounts.get(s.provider) || 0) + 1);
  const providerMix = Array.from(providerCounts.entries())
    .map(([provider, count]) => ({
      provider,
      count,
      label: PROVIDER_META[provider]?.label || provider,
      color: PROVIDER_META[provider]?.color || "#9A9AA8",
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    range,
    rangeLabel: RANGE_LABEL[range],
    totalSongs: blended.length,
    cloudsCreated: cloudRows.length,
    spotifyConnected,
    topGenre: genreBreakdown[0] || null,
    genreBreakdown,
    topArtists,
    topSongs: blended.slice(0, 16),
    providerMix,
  });
}

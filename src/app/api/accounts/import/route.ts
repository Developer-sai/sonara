import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql, ensureDb } from "@/lib/db";
import {
  fetchSpotifyTopTracks,
  fetchYouTubeLikedVideos,
  DEMO_SEED_TRACKS,
} from "@/lib/accountProviders";
import { searchItunes } from "@/lib/musicProviders";
import type { MusicProvider, Song } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const body = await req.json();
    const provider = String(body.provider || "") as MusicProvider;

    await ensureDb();
    const accountRows = (await sql`
      SELECT * FROM connected_accounts WHERE user_id = ${user.id} AND provider = ${provider}
    `) as Record<string, unknown>[];
    const account = accountRows[0];

    if (!account) {
      return NextResponse.json({ error: "That account isn't connected yet." }, { status: 404 });
    }

    let songs: Song[] = [];

    if (account.mode === "oauth" && account.access_token) {
      if (provider === "spotify") {
        songs = await fetchSpotifyTopTracks(account.access_token as string);
      } else if (provider === "youtube_music" || provider === "youtube") {
        songs = await fetchYouTubeLikedVideos(account.access_token as string);
      }
    }

    if (songs.length === 0) {
      // Demo mode, or the live API returned nothing (private/empty library) — use the
      // curated seed list enriched with real artwork so the studio never shows an error.
      const seeds = DEMO_SEED_TRACKS[provider] || [];
      songs = await Promise.all(
        seeds.map(async (s) => {
          const hits = await searchItunes(`${s.title} ${s.artist}`, 1);
          if (hits[0]) return { ...hits[0], title: s.title, artist: s.artist, provider };
          return {
            id: Math.random().toString(36).slice(2, 10),
            title: s.title,
            artist: s.artist,
            album: null,
            artworkUrl: "",
            provider,
            externalUrl: null,
            previewUrl: null,
            durationMs: null,
          } as Song;
        })
      );
    }

    return NextResponse.json({ songs });
  } catch (err) {
    console.error("[accounts/import]", err);
    return NextResponse.json({ error: "Couldn't import songs from that account." }, { status: 500 });
  }
}

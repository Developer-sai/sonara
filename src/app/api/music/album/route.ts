import { NextRequest, NextResponse } from "next/server";
import { fetchDeezerAlbumTracks, fetchItunesAlbumTracks } from "@/lib/musicProviders";

export async function GET(req: NextRequest) {
  try {
    const provider = req.nextUrl.searchParams.get("provider") || "";
    const albumId = req.nextUrl.searchParams.get("albumId") || "";
    if (!albumId.trim()) return NextResponse.json({ tracks: [] });

    const tracks =
      provider === "deezer" ? await fetchDeezerAlbumTracks(albumId) : await fetchItunesAlbumTracks(albumId);

    return NextResponse.json({ tracks });
  } catch (err) {
    console.error("[music/album]", err);
    return NextResponse.json({ tracks: [], error: "Couldn't load that album." }, { status: 500 });
  }
}

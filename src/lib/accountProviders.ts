import type { MusicProvider, Song } from "./types";

export type OAuthKind = "spotify" | "google";

export const OAUTH_KIND_BY_PROVIDER: Partial<Record<MusicProvider, OAuthKind>> = {
  spotify: "spotify",
  youtube_music: "google",
  youtube: "google",
};

export function oauthKindFor(provider: MusicProvider): OAuthKind | null {
  return OAUTH_KIND_BY_PROVIDER[provider] || null;
}

export function isOAuthConfigured(kind: OAuthKind) {
  if (kind === "spotify") {
    return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
  }
  if (kind === "google") {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  return false;
}

export function redirectUriFor(kind: OAuthKind, origin: string) {
  return `${origin}/api/accounts/callback/${kind}`;
}

export function buildAuthorizeUrl(kind: OAuthKind, origin: string, state: string) {
  const redirectUri = redirectUriFor(kind, origin);
  if (kind === "spotify") {
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID || "",
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "user-top-read user-read-email user-read-private playlist-read-private",
      state,
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: redirectUri,
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/youtube.readonly",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export async function exchangeCode(
  kind: OAuthKind,
  code: string,
  origin: string
): Promise<TokenSet | null> {
  const redirectUri = redirectUriFor(kind, origin);
  try {
    if (kind === "spotify") {
      const basic = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64");
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    }
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch {
    return null;
  }
}

export async function fetchProfile(
  kind: OAuthKind,
  accessToken: string
): Promise<{ displayName: string; avatar: string | null } | null> {
  try {
    if (kind === "spotify") {
      const res = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        displayName: data.display_name || data.id || "Spotify user",
        avatar: data.images?.[0]?.url || null,
      };
    }
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      displayName: data.name || data.email || "Google user",
      avatar: data.picture || null,
    };
  } catch {
    return null;
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export type SpotifyTimeRange = "short_term" | "medium_term" | "long_term";

export async function fetchSpotifyTopTracks(
  accessToken: string,
  timeRange: SpotifyTimeRange = "medium_term",
  limit = 20
): Promise<Song[]> {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${timeRange}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    interface SpotifyTrack {
      name: string;
      artists: { name: string }[];
      album: { name: string; images: { url: string }[] };
      external_urls: { spotify: string };
      preview_url: string | null;
      duration_ms: number;
    }
    return (data.items || []).map((t: SpotifyTrack) => ({
      id: uid(),
      title: t.name,
      artist: t.artists.map((a) => a.name).join(", "),
      album: t.album?.name || null,
      artworkUrl: t.album?.images?.[0]?.url || "",
      provider: "spotify" as MusicProvider,
      externalUrl: t.external_urls?.spotify || null,
      previewUrl: t.preview_url,
      durationMs: t.duration_ms || null,
    }));
  } catch {
    return [];
  }
}

export interface SpotifyTopArtist {
  name: string;
  genres: string[];
  image: string | null;
  externalUrl: string | null;
}

export async function fetchSpotifyTopArtists(
  accessToken: string,
  timeRange: SpotifyTimeRange = "medium_term",
  limit = 10
): Promise<SpotifyTopArtist[]> {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/top/artists?limit=${limit}&time_range=${timeRange}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    interface SpotifyArtist {
      name: string;
      genres: string[];
      images: { url: string }[];
      external_urls: { spotify: string };
    }
    return (data.items || []).map((a: SpotifyArtist) => ({
      name: a.name,
      genres: a.genres || [],
      image: a.images?.[0]?.url || null,
      externalUrl: a.external_urls?.spotify || null,
    }));
  } catch {
    return [];
  }
}

/** Spotify access tokens expire after ~1 hour; a Wrapped visit could easily
 *  come long after that, so refresh proactively when close to/past expiry
 *  before hitting the top-tracks/top-artists endpoints. Returns the fresh
 *  access token plus the new expiry/refresh-token pair to persist, or null
 *  if the refresh itself failed (caller should fall back gracefully). */
export async function refreshSpotifyToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  if (!isOAuthConfigured("spotify")) return null;
  try {
    const basic = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in || 3600,
    };
  } catch {
    return null;
  }
}

interface AppToken {
  accessToken: string;
  expiresAt: number;
}

let spotifyAppToken: AppToken | null = null;

/** App-only Spotify access via the Client Credentials flow — no user login,
 *  just the same SPOTIFY_CLIENT_ID/SECRET used for the OAuth "Connect" flow.
 *  Lets search reach Spotify's catalog (great for very recent releases)
 *  without requiring anyone to actually sign in with Spotify. */
async function getSpotifyAppToken(): Promise<string | null> {
  if (!isOAuthConfigured("spotify")) return null;
  if (spotifyAppToken && spotifyAppToken.expiresAt > Date.now() + 5000) {
    return spotifyAppToken.accessToken;
  }
  try {
    const basic = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    spotifyAppToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return spotifyAppToken.accessToken;
  } catch {
    return null;
  }
}

interface SpotifySearchTrack {
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  external_urls: { spotify: string };
  preview_url: string | null;
  duration_ms: number;
}

export async function searchSpotifyCatalog(term: string, limit = 20): Promise<Song[]> {
  if (!term.trim()) return [];
  const token = await getSpotifyAppToken();
  if (!token) return [];
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(term)}&type=track&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items: SpotifySearchTrack[] = data.tracks?.items || [];
    return items.map((t) => ({
      id: uid(),
      title: t.name,
      artist: t.artists.map((a) => a.name).join(", "),
      album: t.album?.name || null,
      artworkUrl: t.album?.images?.[0]?.url || "",
      provider: "spotify" as MusicProvider,
      externalUrl: t.external_urls?.spotify || null,
      previewUrl: t.preview_url,
      durationMs: t.duration_ms || null,
    }));
  } catch {
    return [];
  }
}

export async function fetchYouTubeLikedVideos(accessToken: string): Promise<Song[]> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=20",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    interface YTVideo {
      id: string;
      snippet: {
        title: string;
        channelTitle: string;
        thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
      };
    }
    return (data.items || []).map((v: YTVideo) => ({
      id: uid(),
      title: v.snippet.title,
      artist: v.snippet.channelTitle,
      album: null,
      artworkUrl:
        v.snippet.thumbnails?.high?.url ||
        v.snippet.thumbnails?.medium?.url ||
        v.snippet.thumbnails?.default?.url ||
        "",
      provider: "youtube_music" as MusicProvider,
      externalUrl: `https://www.youtube.com/watch?v=${v.id}`,
      previewUrl: null,
      durationMs: null,
    }));
  } catch {
    return [];
  }
}

export const DEMO_SEED_TRACKS: Record<string, { title: string; artist: string }[]> = {
  apple_music: [
    { title: "Anti-Hero", artist: "Taylor Swift" },
    { title: "As It Was", artist: "Harry Styles" },
    { title: "Flowers", artist: "Miley Cyrus" },
  ],
  soundcloud: [
    { title: "Lucid Dreams", artist: "Juice WRLD" },
    { title: "Whole Lotta Choppas", artist: "Sada Baby" },
  ],
  deezer: [
    { title: "Blinding Lights", artist: "The Weeknd" },
    { title: "Levitating", artist: "Dua Lipa" },
  ],
  amazon_music: [
    { title: "Peaches", artist: "Justin Bieber" },
    { title: "Stay", artist: "The Kid LAROI, Justin Bieber" },
  ],
  tidal: [
    { title: "Redbone", artist: "Childish Gambino" },
    { title: "Location", artist: "Khalid" },
  ],
  spotify: [
    { title: "Vinnane Vinnane", artist: "Armaan Malik" },
    { title: "Ninnila", artist: "Thaman S" },
  ],
  youtube_music: [
    { title: "Arabic Kuthu", artist: "Anirudh Ravichander" },
    { title: "The Rose", artist: "Anirudh Ravichander" },
  ],
};

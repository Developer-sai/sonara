import type { MusicProvider, Song } from "./types";
import { searchSpotifyCatalog } from "./accountProviders";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function detectProvider(url: string): MusicProvider | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "open.spotify.com" || host === "spotify.link") return "spotify";
    if (host === "music.apple.com" || host === "geo.music.apple.com") return "apple_music";
    if (host === "music.youtube.com") return "youtube_music";
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") return "youtube";
    if (host === "soundcloud.com" || host === "on.soundcloud.com") return "soundcloud";
    if (host === "deezer.com" || host === "deezer.page.link" || host.endsWith(".deezer.com")) return "deezer";
    if (host === "music.amazon.com" || host === "amazon.com") return "amazon_music";
    if (host === "tidal.com" || host === "listen.tidal.com") return "tidal";
    return null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, ms = 8000, init?: RequestInit) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SonaraBot/1.0; +https://sonara.app)",
        ...(init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(t);
  }
}

async function tryOEmbed(
  endpoint: string,
  provider: MusicProvider
): Promise<Partial<Song> | null> {
  try {
    const res = await fetchWithTimeout(endpoint, 8000);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    if (!data || !data.title) return null;
    const [title, artist] = splitTitleArtist(data.title, data.author_name);
    return {
      title,
      artist: artist || data.author_name || "",
      artworkUrl: data.thumbnail_url || "",
      provider,
    };
  } catch {
    return null;
  }
}

const NOISE_SUFFIXES =
  /\s*[([]\s*(official\s*(music\s*)?video|official\s*audio|lyrics?( video)?|audio|visualizer|4k\s*remaster(ed)?|hd|hq|explicit|clean)\s*[)\]]\s*/gi;

function cleanTitle(title: string) {
  return title.replace(NOISE_SUFFIXES, " ").replace(/\s{2,}/g, " ").trim();
}

function splitTitleArtist(rawTitle: string, fallbackArtist?: string): [string, string] {
  // Spotify oEmbed titles often look like "Song Name" with author_name as artist.
  // Some feeds format as "Artist - Song".
  const dashSplit = rawTitle.split(/\s[-–—]\s/);
  if (dashSplit.length === 2 && !fallbackArtist) {
    return [cleanTitle(dashSplit[1]), dashSplit[0].trim()];
  }
  // YouTube-style titles often repeat "Artist - Song (Official Video)" even when
  // author_name (channel) already gives us the artist — strip the redundant prefix.
  let title = cleanTitle(rawTitle);
  if (fallbackArtist && dashSplit.length >= 2) {
    const prefix = dashSplit[0].trim().toLowerCase();
    if (prefix === fallbackArtist.trim().toLowerCase()) {
      title = cleanTitle(rawTitle.slice(dashSplit[0].length).replace(/^\s*[-–—]\s*/, ""));
    }
  }
  return [title, (fallbackArtist || "").trim()];
}

function extractMeta(html: string, prop: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return null;
}

function decodeHtmlEntities(str: string) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function tryOgScrape(
  url: string,
  provider: MusicProvider
): Promise<Partial<Song> | null> {
  try {
    const res = await fetchWithTimeout(url, 9000);
    if (!res.ok) return null;
    const html = await res.text();
    const ogTitle = extractMeta(html, "og:title") || extractMeta(html, "twitter:title");
    const ogImage = extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
    const ogDesc = extractMeta(html, "og:description") || extractMeta(html, "music:musician");
    if (!ogTitle) return null;
    const [title, artistFromTitle] = splitTitleArtist(ogTitle);
    const artist = artistFromTitle || (ogDesc ? ogDesc.split(/[·|,]/)[0].trim() : "");
    return {
      title,
      artist,
      artworkUrl: ogImage || "",
      provider,
    };
  } catch {
    return null;
  }
}

function placeholderArtwork(seed: string) {
  const colors = [
    ["#b06bff", "#ff5fa8"],
    ["#5fc9ff", "#b06bff"],
    ["#ffd35f", "#ff5fa8"],
    ["#5fffb0", "#5fc9ff"],
  ];
  const idx = Math.abs(hashCode(seed)) % colors.length;
  const [c1, c2] = colors[idx];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='500' height='500' fill='url(#g)'/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export interface ResolveResult {
  song: Song | null;
  error?: string;
}

export async function resolveLink(rawUrl: string): Promise<ResolveResult> {
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    return { song: null, error: "Please paste a full link starting with http:// or https://" };
  }
  const provider = detectProvider(url);
  if (!provider) {
    return {
      song: null,
      error:
        "Couldn't recognize that link's platform. Try a Spotify, Apple Music, YouTube Music, YouTube, SoundCloud, Deezer, Amazon Music or TIDAL link.",
    };
  }

  let partial: Partial<Song> | null = null;

  if (provider === "spotify") {
    partial = await tryOEmbed(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
      "spotify"
    );
  } else if (provider === "youtube" || provider === "youtube_music") {
    const normalized = url.replace("music.youtube.com", "www.youtube.com");
    partial = await tryOEmbed(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(normalized)}&format=json`,
      provider
    );
  } else if (provider === "soundcloud") {
    partial = await tryOEmbed(
      `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      "soundcloud"
    );
  }

  if (!partial) {
    partial = await tryOgScrape(url, provider);
  }

  if (!partial || !partial.title) {
    return {
      song: null,
      error:
        "Couldn't fetch details for that link right now. The page may be region-locked or unreachable — try another link or search instead.",
    };
  }

  // Enrich with iTunes for higher-res artwork + preview audio when possible.
  // Some providers (Spotify's oEmbed no longer returns author_name) don't give us
  // an artist at all, so fall back to whatever iTunes matched on title alone.
  let artworkUrl = partial.artworkUrl || "";
  let artist = partial.artist || "";
  let previewUrl: string | null = null;
  try {
    const enriched = await searchItunesBest(`${partial.title} ${artist}`.trim());
    if (enriched) {
      if (enriched.artworkUrl) artworkUrl = enriched.artworkUrl;
      if (!artist) artist = enriched.artist;
      previewUrl = enriched.previewUrl || null;
    }
  } catch {
    // Non-fatal — keep whatever we already have.
  }

  const song: Song = {
    id: uid(),
    title: partial.title || "Untitled",
    artist: artist || "Unknown Artist",
    album: null,
    artworkUrl: artworkUrl || placeholderArtwork(partial.title || url),
    provider,
    externalUrl: url,
    previewUrl,
    durationMs: null,
  };

  return { song };
}

interface ITunesRawResult {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackViewUrl?: string;
  trackId?: number;
  primaryGenreName?: string;
  collectionId?: number;
}

function upscaleArtwork(url?: string) {
  if (!url) return "";
  return url.replace(/\/\d+x\d+bb\.(jpg|png)/, "/1200x1200bb.$1");
}

export async function searchItunes(term: string, limit = 20): Promise<Song[]> {
  if (!term.trim()) return [];
  try {
    const res = await fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        term
      )}&media=music&entity=song&limit=${limit}`,
      8000
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: ITunesRawResult[] };
    return (data.results || []).map((r) => ({
      id: uid(),
      title: r.trackName || "Untitled",
      artist: r.artistName || "Unknown Artist",
      album: r.collectionName || null,
      artworkUrl: upscaleArtwork(r.artworkUrl100) || placeholderArtwork(r.trackName || term),
      provider: "itunes" as MusicProvider,
      externalUrl: r.trackViewUrl || null,
      previewUrl: r.previewUrl || null,
      durationMs: r.trackTimeMillis || null,
      genre: r.primaryGenreName || null,
      albumId: r.collectionId ? String(r.collectionId) : null,
    }));
  } catch {
    return [];
  }
}

export async function fetchItunesAlbumTracks(albumId: string): Promise<Song[]> {
  try {
    const res = await fetchWithTimeout(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(albumId)}&entity=song`,
      8000
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: (ITunesRawResult & { wrapperType?: string })[] };
    return (data.results || [])
      .filter((r) => r.wrapperType === "track" && r.trackId)
      .map((r) => ({
        id: uid(),
        title: r.trackName || "Untitled",
        artist: r.artistName || "Unknown Artist",
        album: r.collectionName || null,
        artworkUrl: upscaleArtwork(r.artworkUrl100) || placeholderArtwork(r.trackName || albumId),
        provider: "itunes" as MusicProvider,
        externalUrl: r.trackViewUrl || null,
        previewUrl: r.previewUrl || null,
        durationMs: r.trackTimeMillis || null,
        genre: r.primaryGenreName || null,
        albumId: r.collectionId ? String(r.collectionId) : null,
      }));
  } catch {
    return [];
  }
}

interface DeezerAlbumTrack {
  title?: string;
  artist?: { name?: string };
  link?: string;
  preview?: string;
  duration?: number;
}

export async function fetchDeezerAlbumTracks(albumId: string): Promise<Song[]> {
  try {
    const res = await fetchWithTimeout(`https://api.deezer.com/album/${encodeURIComponent(albumId)}`, 8000);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      title?: string;
      cover_xl?: string;
      cover_big?: string;
      tracks?: { data?: DeezerAlbumTrack[] };
    };
    const artworkUrl = data.cover_xl || data.cover_big || "";
    return (data.tracks?.data || []).map((r) => ({
      id: uid(),
      title: r.title || "Untitled",
      artist: r.artist?.name || "Unknown Artist",
      album: data.title || null,
      artworkUrl: artworkUrl || placeholderArtwork(r.title || albumId),
      provider: "deezer" as MusicProvider,
      externalUrl: r.link || null,
      previewUrl: r.preview || null,
      durationMs: r.duration ? r.duration * 1000 : null,
      albumId,
    }));
  } catch {
    return [];
  }
}

async function searchItunesBest(term: string): Promise<Song | null> {
  const results = await searchItunes(term, 1);
  return results[0] || null;
}

interface DeezerRawTrack {
  title?: string;
  artist?: { name?: string };
  album?: { id?: number; title?: string; cover_big?: string; cover_xl?: string; cover_medium?: string };
  link?: string;
  preview?: string;
  duration?: number;
}

export async function searchDeezer(term: string, limit = 20): Promise<Song[]> {
  if (!term.trim()) return [];
  try {
    const res = await fetchWithTimeout(
      `https://api.deezer.com/search?q=${encodeURIComponent(term)}&limit=${limit}`,
      8000
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: DeezerRawTrack[] };
    return (data.data || []).map((r) => ({
      id: uid(),
      title: r.title || "Untitled",
      artist: r.artist?.name || "Unknown Artist",
      album: r.album?.title || null,
      artworkUrl:
        r.album?.cover_xl || r.album?.cover_big || r.album?.cover_medium || placeholderArtwork(r.title || term),
      provider: "deezer" as MusicProvider,
      externalUrl: r.link || null,
      previewUrl: r.preview || null,
      durationMs: r.duration ? r.duration * 1000 : null,
      albumId: r.album?.id ? String(r.album.id) : null,
    }));
  } catch {
    return [];
  }
}

function dedupeKey(s: Song) {
  return `${s.title.trim().toLowerCase().replace(/\s*\([^)]*\)\s*/g, "")}::${s.artist
    .trim()
    .toLowerCase()
    .split(",")[0]}`;
}

async function mergedSearch(term: string, limit: number): Promise<Song[]> {
  const [itunes, deezer, spotify] = await Promise.all([
    searchItunes(term, limit),
    searchDeezer(term, limit),
    searchSpotifyCatalog(term, limit).catch(() => []),
  ]);

  const merged: Song[] = [];
  const seen = new Set<string>();
  // Interleave so no single catalog dominates the top of the list.
  const max = Math.max(itunes.length, deezer.length, spotify.length);
  for (let i = 0; i < max; i++) {
    for (const list of [spotify, itunes, deezer]) {
      const song = list[i];
      if (!song) continue;
      const key = dedupeKey(song);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(song);
    }
  }
  return merged.slice(0, limit);
}

/** A few hundred artist/act names spanning global pop and the regional
 *  catalogs SONARA leans on (Telugu/Tamil/Hindi cinema, K-pop) — used only
 *  as a typo-correction dictionary, not as a source of truth for search. */
const KNOWN_ARTISTS = [
  "anirudh ravichander", "thaman s", "devi sri prasad", "harris jayaraj", "yuvan shankar raja",
  "ar rahman", "ilaiyaraaja", "sid sriram", "armaan malik", "shreya ghoshal", "arijit singh",
  "pritam", "sai abhyankar", "santhosh narayanan", "gv prakash kumar", "hiphop tamizha",
  "the weeknd", "taylor swift", "ariana grande", "dua lipa", "harry styles", "billie eilish",
  "drake", "the kid laroi", "justin bieber", "ed sheeran", "olivia rodrigo", "sza", "beyonce",
  "rihanna", "bruno mars", "post malone", "travis scott", "kendrick lamar", "doja cat",
  "miley cyrus", "khalid", "childish gambino", "juice wrld", "imagine dragons", "coldplay",
  "bts", "blackpink", "stray kids", "twice", "seventeen", "newjeans", "aespa",
  "anitta", "bad bunny", "peso pluma", "shakira", "karol g",
];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/** When a search comes back nearly empty, check whether the query is a close
 *  typo of a well-known artist and, if so, return the corrected query — so a
 *  misspelling like "Anirud Ravichender" still finds real results instead of
 *  a dead end. Pure local edit-distance check, no external spellcheck API. */
function suggestCorrection(term: string): string | null {
  const clean = term.trim().toLowerCase();
  if (clean.length < 4) return null;
  let best: { name: string; dist: number } | null = null;
  for (const name of KNOWN_ARTISTS) {
    if (name === clean) return null; // already exact, nothing to correct
    const dist = levenshtein(clean, name);
    const threshold = clean.length <= 8 ? 2 : 3;
    if (dist <= threshold && (!best || dist < best.dist)) best = { name, dist };
  }
  return best ? best.name : null;
}

/** Merges results across catalogs (iTunes, Deezer, and Spotify's app catalog when
 *  configured) so search covers far more than any single store — including very
 *  recent releases a single provider might not have indexed yet. Falls back to a
 *  local typo-correction dictionary when a query returns almost nothing. */
export async function universalSearch(
  term: string,
  limit = 24
): Promise<{ results: Song[]; correctedQuery: string | null }> {
  if (!term.trim()) return { results: [], correctedQuery: null };

  const results = await mergedSearch(term, limit);
  if (results.length >= 3) return { results, correctedQuery: null };

  const correction = suggestCorrection(term);
  if (!correction) return { results, correctedQuery: null };

  const correctedResults = await mergedSearch(correction, limit);
  if (correctedResults.length <= results.length) return { results, correctedQuery: null };
  return { results: correctedResults, correctedQuery: correction };
}

interface AppleRssItem {
  artistName?: string;
  name?: string;
  artworkUrl100?: string;
  url?: string;
  releaseDate?: string;
}

/** Apple's public "marketing tools" RSS feed — no API key, updated daily. */
async function fetchAppleChart(country: string, limit: number) {
  try {
    const res = await fetchWithTimeout(
      `https://rss.marketingtools.apple.com/api/v2/${country}/music/most-played/${limit}/songs.json`,
      8000
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { feed?: { results?: AppleRssItem[] } };
    return data.feed?.results || [];
  } catch {
    return [];
  }
}

/** Deezer's public global chart — no API key required. */
async function fetchDeezerChart(limit: number): Promise<Song[]> {
  try {
    const res = await fetchWithTimeout(`https://api.deezer.com/chart/0/tracks?limit=${limit}`, 8000);
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: DeezerRawTrack[] };
    return (data.data || []).map((r) => ({
      id: uid(),
      title: r.title || "Untitled",
      artist: r.artist?.name || "Unknown Artist",
      album: r.album?.title || null,
      artworkUrl: r.album?.cover_xl || r.album?.cover_big || placeholderArtwork(r.title || "chart"),
      provider: "deezer" as MusicProvider,
      externalUrl: r.link || null,
      previewUrl: r.preview || null,
      durationMs: r.duration ? r.duration * 1000 : null,
    }));
  } catch {
    return [];
  }
}

export interface TrendingResult {
  trending: Song[];
}

/** "Latest & trending" — blends Apple's most-played chart with Deezer's global
 *  chart, both public and updated daily with no API key required. */
export async function getTrending(country = "us"): Promise<TrendingResult> {
  const [mostPlayed, deezerChart] = await Promise.all([
    fetchAppleChart(country, 20),
    fetchDeezerChart(20),
  ]);

  const toSong = (item: AppleRssItem): Song => ({
    id: uid(),
    title: item.name || "Untitled",
    artist: item.artistName || "Unknown Artist",
    album: null,
    artworkUrl: upscaleArtwork(item.artworkUrl100) || placeholderArtwork(item.name || "chart"),
    provider: "itunes",
    externalUrl: item.url || null,
    previewUrl: null,
    durationMs: null,
  });

  const dedupe = (songs: Song[]) => {
    const seen = new Set<string>();
    return songs.filter((s) => {
      const key = dedupeKey(s);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Interleave the two charts so neither source dominates the top of the list.
  const interleaved: Song[] = [];
  const appleSongs = mostPlayed.map(toSong);
  const max = Math.max(appleSongs.length, deezerChart.length);
  for (let i = 0; i < max; i++) {
    if (appleSongs[i]) interleaved.push(appleSongs[i]);
    if (deezerChart[i]) interleaved.push(deezerChart[i]);
  }

  return { trending: dedupe(interleaved).slice(0, 24) };
}

// ---- Demo sets (curated Telugu + global collections, enriched live via iTunes) ----

export interface DemoSetDef {
  slug: string;
  title: string;
  description: string;
  coverHint: string;
  tracks: { title: string; artist: string }[];
}

export const DEMO_SETS: DemoSetDef[] = [
  {
    slug: "surya-sokrishnan",
    title: "Surya S/o Krishnan",
    description: "Harris Jayaraj's Telugu soundtrack, straight from the sample aura.",
    coverHint: "Surya s/o Krishnan Telugu movie soundtrack",
    tracks: [
      { title: "Monna Kanipinchavu", artist: "Harris Jayaraj, Naresh Iyer" },
      { title: "Casanovaa", artist: "Harris Jayaraj, Tippu" },
      { title: "Yenno Yenno", artist: "Harris Jayaraj, Karthik" },
      { title: "Idhedho Bagundhe", artist: "Harris Jayaraj, Shreya Ghoshal" },
    ],
  },
  {
    slug: "jalsa",
    title: "Jalsa",
    description: "Devi Sri Prasad's golden-era Jalsa hits.",
    coverHint: "Jalsa Telugu movie soundtrack Pawan Kalyan",
    tracks: [
      { title: "Jalsa Jalsa", artist: "Baba Sehgal, Rita Thyagarajan" },
      { title: "Jennifer Lopez", artist: "Benny Dayal, Priya" },
      { title: "My Heart Is Beating", artist: "KK" },
      { title: "Gaallo Thelinattunde", artist: "Tippu, Gopika Poornima" },
      { title: "You & I", artist: "Devi Sri Prasad" },
      { title: "Chalore Chalore", artist: "Ranjith Govind" },
    ],
  },
  {
    slug: "toliprema",
    title: "Toliprema",
    description: "Thaman S's nostalgic remake soundtrack.",
    coverHint: "Toliprema Telugu movie soundtrack",
    tracks: [
      { title: "Break The Rules", artist: "Raghu Dixit" },
      { title: "Ninnila", artist: "Armaan Malik, Thaman S" },
      { title: "Sunona Sunaina", artist: "Rahul Nambiar" },
      { title: "Vinnane Vinnane", artist: "Armaan Malik, Devan Ekambaram" },
      { title: "Allasani Vaari", artist: "Shreya Ghoshal" },
      { title: "Toliprema", artist: "Kala Bhairava" },
    ],
  },
  {
    slug: "anirudh-essentials",
    title: "Anirudh Essentials",
    description: "The Rose and other Anirudh Ravichander anthems.",
    coverHint: "Anirudh Ravichander The Rose Coolie",
    tracks: [
      { title: "The Rose (Instrumental)", artist: "Anirudh Ravichander" },
      { title: "Halamithi Habibo", artist: "Anirudh Ravichander" },
      { title: "Arabic Kuthu", artist: "Anirudh Ravichander" },
      { title: "Whistle Podu", artist: "Anirudh Ravichander" },
    ],
  },
];

export async function buildDemoSet(slug: string): Promise<{
  def: DemoSetDef;
  items: Song[];
} | null> {
  const def = DEMO_SETS.find((d) => d.slug === slug);
  if (!def) return null;
  const items = await Promise.all(
    def.tracks.map(async (t) => {
      const query = `${t.title} ${t.artist}`;
      const hit = await searchItunesBest(query);
      if (hit) {
        return { ...hit, title: t.title, artist: t.artist };
      }
      return {
        id: uid(),
        title: t.title,
        artist: t.artist,
        album: def.title,
        artworkUrl: placeholderArtwork(t.title),
        provider: "demo" as MusicProvider,
        externalUrl: null,
        previewUrl: null,
        durationMs: null,
      } as Song;
    })
  );
  return { def, items };
}

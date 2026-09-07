"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Link2,
  Sparkles,
  Plus,
  Loader2,
  Check,
  Music2,
  Play,
  Pause,
  TrendingUp,
  Disc3,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudioStore } from "@/store/studioStore";
import { useAuthStore } from "@/store/authStore";
import { PROVIDER_META, type MusicProvider, type Song } from "@/lib/types";
import { proxied } from "@/lib/proxyImage";
import { cn } from "@/lib/utils";
import { ShimmerText } from "@/components/ui/shimmer-text";
import ConnectedAccounts from "./ConnectedAccounts";

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SongRow({
  song,
  onAdd,
  added,
}: {
  song: Song;
  onAdd: () => void;
  added: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [addingAlbum, setAddingAlbum] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const addSongs = useStudioStore((s) => s.addSongs);

  async function handleAddAlbum() {
    if (!song.albumId || addingAlbum) return;
    setAddingAlbum(true);
    try {
      const res = await fetch(
        `/api/music/album?provider=${song.provider}&albumId=${encodeURIComponent(song.albumId)}`
      );
      const data = await res.json();
      const tracks: Song[] = data.tracks || [];
      if (tracks.length === 0) {
        toast.error("Couldn't load that album.");
        return;
      }
      addSongs(tracks);
      toast.success(`Added all ${tracks.length} tracks from "${song.album || "the album"}"`);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setAddingAlbum(false);
    }
  }

  useEffect(() => {
    if (typeof Audio !== "undefined") audioRef.current = new Audio();
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  function togglePreview() {
    const audio = audioRef.current;
    if (!audio || !song.previewUrl) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.src = song.previewUrl;
    audio.play().catch(() => {});
    setPlaying(true);
    audio.onended = () => setPlaying(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5">
      <img
        src={proxied(song.artworkUrl)}
        alt=""
        className="size-11 shrink-0 rounded-lg object-cover bg-secondary"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{song.title}</p>
        <div className="flex items-center gap-1.5">
          <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
          {PROVIDER_META[song.provider] && (
            <span
              className="hidden shrink-0 rounded-full px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-white/90 sm:inline-block"
              style={{ backgroundColor: `${PROVIDER_META[song.provider].color}55` }}
            >
              {PROVIDER_META[song.provider].label}
            </span>
          )}
        </div>
      </div>
      {song.albumId && (
        <button
          onClick={handleAddAlbum}
          disabled={addingAlbum}
          title="Add the whole album"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {addingAlbum ? <Loader2 className="size-3.5 animate-spin" /> : <Disc3 className="size-3.5" />}
        </button>
      )}
      {song.previewUrl && (
        <button
          onClick={togglePreview}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
        </button>
      )}
      <Button size="icon" variant={added ? "secondary" : "default"} className="size-8 shrink-0" onClick={onAdd}>
        {added ? <Check className="size-4" /> : <Plus className="size-4" />}
      </Button>
    </div>
  );
}

const COUNTRIES: { code: string; label: string; flag: string }[] = [
  { code: "us", label: "Global", flag: "🌎" },
  { code: "in", label: "India", flag: "🇮🇳" },
  { code: "kr", label: "K-Pop", flag: "🇰🇷" },
  { code: "gb", label: "UK", flag: "🇬🇧" },
  { code: "mx", label: "Latin", flag: "🇲🇽" },
];

const VIBE_CHIPS: { label: string; query: string }[] = [
  { label: "⚡ Viral Right Now", query: "tiktok viral hits" },
  { label: "🌙 Late Night", query: "late night rnb chill" },
  { label: "❤️ Love & Romance", query: "romantic acoustic love songs" },
  { label: "💿 Y2K Nostalgia", query: "2000s hits" },
  { label: "🔥 Gym Pump", query: "workout hype hip hop" },
  { label: "🎭 Telugu Classics", query: "telugu melody hits" },
];

function SearchTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [trending, setTrending] = useState<Song[]>([]);
  const [country, setCountry] = useState("us");
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const debounced = useDebounced(query, 400);
  const songs = useStudioStore((s) => s.songs);
  const addSong = useStudioStore((s) => s.addSong);

  const isSearching = Boolean(debounced.trim());
  const displayResults = isSearching ? results : trending;

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setTrendingLoading(true);
        return fetch(`/api/music/trending?country=${country}`);
      })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setTrending(data.trending || []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setTrendingLoading(false));
    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    if (!debounced.trim()) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
        return fetch(`/api/music/search?q=${encodeURIComponent(debounced)}`);
      })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setResults(data.results || []);
          setCorrectedQuery(data.correctedQuery || null);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const showLoading = isSearching ? loading : trendingLoading;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any song, artist, or album…"
          className="pl-10"
        />
        {showLoading && (
          <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {!isSearching && (
        <div className="flex flex-wrap gap-1.5">
          {VIBE_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => setQuery(chip.query)}
              className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-white/5 hover:text-foreground"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {isSearching && correctedQuery && (
        <p className="text-xs text-muted-foreground">
          No exact match for &quot;{debounced}&quot; — showing results for{" "}
          <span className="font-medium text-foreground">&quot;{correctedQuery}&quot;</span>
        </p>
      )}

      {!isSearching && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUp className="size-3.5" />
            <ShimmerText>Trending now</ShimmerText>
          </div>
          <div className="flex flex-wrap gap-1">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCountry(c.code)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  country === c.code
                    ? "border-primary/60 bg-primary/15 text-foreground"
                    : "border-border/70 text-muted-foreground hover:bg-white/5"
                )}
              >
                {c.flag} {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="h-[min(52vh,420px)]">
        <div className="flex flex-col gap-0.5 pr-2">
          {displayResults.map((song) => {
            const added = songs.some((s) => s.title === song.title && s.artist === song.artist);
            return <SongRow key={song.id} song={song} added={added} onAdd={() => addSong(song)} />;
          })}
          {!loading && isSearching && displayResults.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No results — try another search.</p>
          )}
          {!trendingLoading && !isSearching && displayResults.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Search across iTunes, Deezer and more — instant results, real artwork, 30s previews.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function LinkTab() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const addSong = useStudioStore((s) => s.addSong);

  async function handleResolve() {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/music/resolve-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't resolve that link.");
        return;
      }
      addSong(data.song);
      toast.success(`Added "${data.song.title}"`);
      setUrl("");
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleResolve()}
            placeholder="Paste a Spotify, Apple Music, YouTube…"
            className="pl-10"
          />
        </div>
        <Button onClick={handleResolve} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Add"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["spotify", "apple_music", "youtube_music", "youtube", "soundcloud", "deezer", "amazon_music", "tidal"] as MusicProvider[]).map(
          (p) => (
            <Badge key={p} variant="outline" className="text-[11px]">
              {PROVIDER_META[p].label}
            </Badge>
          )
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Works instantly with no account needed — SONARA resolves title, artist and artwork straight
        from the link. No developer whitelisting required.
      </p>
    </div>
  );
}

interface DemoSetSummary {
  slug: string;
  title: string;
  description: string;
  trackCount: number;
}

function DemoTab() {
  const [sets, setSets] = useState<DemoSetSummary[]>([]);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const addSongs = useStudioStore((s) => s.addSongs);
  const setTitle = useStudioStore((s) => s.setTitle);

  useEffect(() => {
    fetch("/api/music/demo-sets")
      .then((r) => r.json())
      .then((data) => setSets(data.sets || []))
      .catch(() => {});
  }, []);

  async function loadSet(slug: string, title: string) {
    setLoadingSlug(slug);
    try {
      const res = await fetch(`/api/music/demo-sets/${slug}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't load that demo set.");
        return;
      }
      addSongs(data.items || []);
      setTitle(title);
      toast.success(`Loaded "${title}"`);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setLoadingSlug(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs text-muted-foreground">
        1-click curated sets matching the sample aura — Telugu classics + global favorites.
      </p>
      {sets.map((set) => (
        <button
          key={set.slug}
          onClick={() => loadSet(set.slug, set.title)}
          disabled={loadingSlug !== null}
          className="flex items-center gap-3 rounded-xl border border-border/70 p-3 text-left transition-colors hover:border-primary/50 hover:bg-white/5 disabled:opacity-60"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--aura-1)]/25 to-[var(--aura-2)]/25 text-primary">
            {loadingSlug === set.slug ? <Loader2 className="size-4 animate-spin" /> : <Music2 className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{set.title}</p>
            <p className="truncate text-xs text-muted-foreground">{set.description}</p>
          </div>
          <Badge variant="secondary">{set.trackCount} songs</Badge>
        </button>
      ))}
    </div>
  );
}

export default function IngestionPanel() {
  const user = useAuthStore((s) => s.user);

  return (
    <Tabs defaultValue="search" className="flex flex-col gap-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="search">
          <Search className="size-3.5" />
        </TabsTrigger>
        <TabsTrigger value="link">
          <Link2 className="size-3.5" />
        </TabsTrigger>
        <TabsTrigger value="demo">
          <Sparkles className="size-3.5" />
        </TabsTrigger>
        <TabsTrigger value="accounts">
          <Music2 className="size-3.5" />
        </TabsTrigger>
      </TabsList>

      <AnimatePresence mode="wait">
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <TabsContent value="search" className={cn("mt-0")}>
            <SearchTab />
          </TabsContent>
          <TabsContent value="link" className="mt-0">
            <LinkTab />
          </TabsContent>
          <TabsContent value="demo" className="mt-0">
            <DemoTab />
          </TabsContent>
          <TabsContent value="accounts" className="mt-0">
            <ConnectedAccounts />
          </TabsContent>
        </motion.div>
      </AnimatePresence>

      {!user && (
        <p className="rounded-xl border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
          Search, links and demo sets work as a guest. Sign up to connect accounts and save your clouds.
        </p>
      )}
    </Tabs>
  );
}

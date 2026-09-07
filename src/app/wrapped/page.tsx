"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Sparkles, Loader2, Music2, Wand2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { Card } from "@/components/ui/card";
import { proxied } from "@/lib/proxyImage";
import { useAuthStore } from "@/store/authStore";
import { useStudioStore } from "@/store/studioStore";
import type { MusicProvider, Song } from "@/lib/types";
import { cn } from "@/lib/utils";

type Range = "week" | "month" | "year" | "all";

const RANGES: { value: Range; label: string }[] = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

const GENRE_COLORS = ["#b06bff", "#ff5fa8", "#5fc9ff", "#ffd35f", "#6bffb0", "#ff8a5f", "#9a9aa8", "#7dd3fc"];

interface WrappedData {
  range: Range;
  rangeLabel: string;
  totalSongs: number;
  cloudsCreated: number;
  spotifyConnected: boolean;
  topGenre: { genre: string; count: number } | null;
  genreBreakdown: { genre: string; count: number }[];
  topArtists: { name: string; count: number; image: string | null }[];
  topSongs: Song[];
  providerMix: { provider: MusicProvider; count: number; label: string; color: string }[];
}

export default function WrappedPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const addSongs = useStudioStore((s) => s.addSongs);
  const applyTemplate = useStudioStore((s) => s.applyTemplate);

  const [range, setRange] = useState<Range>("year");
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
      return fetch(`/api/wrapped?range=${range}`);
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load your Wrapped.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, range]);

  function handleMakeCard() {
    if (!data || data.topSongs.length === 0) return;
    addSongs(data.topSongs);
    applyTemplate("grid_3x3");
    router.push("/studio");
    toast.success("Loaded into the Studio — arrange and export your Wrapped card!");
  }

  const genreTotal = data?.genreBreakdown.reduce((sum, g) => sum + g.count, 0) || 0;
  const providerTotal = data?.providerMix.reduce((sum, p) => sum + p.count, 0) || 0;

  return (
    <div className="aura-field min-h-[calc(100vh-4rem)] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-accent" /> Your music, wrapped
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-5xl">
            Sonara <span className="text-gradient">Wrapped</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Every song you&apos;ve added, plus your real Spotify listening when connected —
            rolled up into one shareable recap.
          </p>
        </motion.div>

        {!user && !authLoading ? (
          <Card className="glass mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
            <Music2 className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Wrapped is built from your saved history, so you&apos;ll need an account.
            </p>
            <Button onClick={() => setAuthModalOpen(true, "register")}>Sign up — it&apos;s free</Button>
          </Card>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    range === r.value
                      ? "border-primary/60 bg-primary/15 text-foreground"
                      : "border-border/70 text-muted-foreground hover:bg-white/5"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}

            <AnimatePresence mode="wait">
              {!loading && data && data.totalSongs === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-16 text-center text-sm text-muted-foreground"
                >
                  Nothing here for {data.rangeLabel.toLowerCase()} yet. Add some songs in the{" "}
                  <button onClick={() => router.push("/studio")} className="text-primary hover:underline">
                    Studio
                  </button>
                  {" "}or connect Spotify to pull in your real listening history.
                </motion.div>
              )}

              {!loading && data && data.totalSongs > 0 && (
                <motion.div
                  key={range}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-5"
                >
                  <Card className="glass flex flex-col items-center gap-3 p-8 text-center">
                    <Radio className="size-6 text-primary" />
                    <div className="font-display text-6xl font-bold text-gradient">{data.totalSongs}</div>
                    <p className="text-sm text-muted-foreground">
                      songs {data.rangeLabel.toLowerCase()}
                      {data.spotifyConnected && " · including your real Spotify top tracks"}
                    </p>
                    {data.topGenre && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Your top genre:{" "}
                        <span className="font-semibold text-foreground">{data.topGenre.genre}</span>
                      </p>
                    )}
                  </Card>

                  {data.genreBreakdown.length >= 2 && (
                    <Card className="flex flex-col gap-3 p-5">
                      <h3 className="font-display text-sm font-semibold text-muted-foreground">
                        Genre breakdown
                      </h3>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                        {data.genreBreakdown.map((g, i) => (
                          <motion.div
                            key={g.genre}
                            initial={{ width: 0 }}
                            animate={{ width: `${(g.count / genreTotal) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            style={{ backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length] }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {data.genreBreakdown.map((g, i) => (
                          <div key={g.genre} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length] }}
                            />
                            {g.genre} · {Math.round((g.count / genreTotal) * 100)}%
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {data.topArtists.length > 0 && (
                    <Card className="flex flex-col gap-3 p-5">
                      <h3 className="font-display text-sm font-semibold text-muted-foreground">
                        Top artists
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {data.topArtists.slice(0, 6).map((a, i) => (
                          <div key={a.name} className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-2">
                            <span className="w-4 shrink-0 text-center text-xs font-semibold text-muted-foreground">
                              {i + 1}
                            </span>
                            {a.image ? (
                              <img
                                src={proxied(a.image)}
                                alt=""
                                className="size-8 shrink-0 rounded-full object-cover bg-secondary"
                              />
                            ) : (
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold">
                                {a.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <span className="truncate text-sm font-medium">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {data.topSongs.length > 0 && (
                    <Card className="flex flex-col gap-3 p-5">
                      <h3 className="font-display text-sm font-semibold text-muted-foreground">
                        Top songs
                      </h3>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {data.topSongs.slice(0, 12).map((s) => (
                          <img
                            key={s.id}
                            src={proxied(s.artworkUrl)}
                            alt={s.title}
                            title={`${s.title} — ${s.artist}`}
                            className="aspect-square w-full rounded-lg object-cover shadow-lg"
                          />
                        ))}
                      </div>
                    </Card>
                  )}

                  {providerTotal >= 2 && (
                    <Card className="flex flex-col gap-3 p-5">
                      <h3 className="font-display text-sm font-semibold text-muted-foreground">
                        Where it came from
                      </h3>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                        {data.providerMix.map((p) => (
                          <motion.div
                            key={p.provider}
                            initial={{ width: 0 }}
                            animate={{ width: `${(p.count / providerTotal) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            style={{ backgroundColor: p.color }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {data.providerMix.map((p) => (
                          <div key={p.provider} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                            {p.label} · {Math.round((p.count / providerTotal) * 100)}%
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {!data.spotifyConnected && (
                    <p className="text-center text-xs text-muted-foreground">
                      Connect Spotify from the Studio to blend in your real listening history next time.
                    </p>
                  )}

                  <div className="flex justify-center">
                    <ParticleButton size="lg" onClick={handleMakeCard}>
                      <Wand2 className="size-4" /> Make a shareable Wrapped card
                    </ParticleButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

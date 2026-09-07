"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Heart, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { Card } from "@/components/ui/card";
import SoundPicker from "@/components/our-sound/SoundPicker";
import { proxied } from "@/lib/proxyImage";
import { useStudioStore } from "@/store/studioStore";
import type { Song } from "@/lib/types";

interface BlendResult {
  shared: Song[];
  onlyA: Song[];
  onlyB: Song[];
  blended: Song[];
  harmonyScore: number;
}

function scoreLabel(score: number) {
  if (score >= 80) return { label: "Soulmates", color: "#ff5fa8" };
  if (score >= 60) return { label: "Great Match", color: "#b06bff" };
  if (score >= 40) return { label: "Good Vibes", color: "#5fc9ff" };
  if (score >= 20) return { label: "Different Wavelengths", color: "#ffd35f" };
  return { label: "Total Opposites", color: "#9a9aa8" };
}

export default function OurSoundPage() {
  const router = useRouter();
  const [songsA, setSongsA] = useState<Song[]>([]);
  const [songsB, setSongsB] = useState<Song[]>([]);
  const [result, setResult] = useState<BlendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const addSongs = useStudioStore((s) => s.addSongs);
  const applyTemplate = useStudioStore((s) => s.applyTemplate);

  async function handleBlend() {
    if (songsA.length === 0 || songsB.length === 0) {
      toast.error("Add a few songs to both sides first.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/our-sound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a: songsA, b: songsB }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't blend your sound.");
        return;
      }
      setResult(data);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleMakeCard() {
    if (!result) return;
    addSongs(result.blended);
    applyTemplate("grid_2x3");
    router.push("/studio");
    toast.success("Loaded into the Studio — arrange and export it!");
  }

  return (
    <div className="aura-field min-h-[calc(100vh-4rem)] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Heart className="size-3.5 text-accent" /> Music compatibility
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-5xl">
            Our <span className="text-gradient">Sound</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Add a few of your favorite songs, add theirs, and see how much your music taste
            actually overlaps.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SoundPicker label="Your songs" accent="#b06bff" songs={songsA} onAdd={(s) => setSongsA((v) => [...v, s])} onRemove={(id) => setSongsA((v) => v.filter((s) => s.id !== id))} />
          <SoundPicker label="Their songs" accent="#ff5fa8" songs={songsB} onAdd={(s) => setSongsB((v) => [...v, s])} onRemove={(id) => setSongsB((v) => v.filter((s) => s.id !== id))} />
        </div>

        <div className="mt-6 flex justify-center">
          <ParticleButton size="lg" onClick={handleBlend} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            Blend our sound
          </ParticleButton>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-10"
            >
              <Card className="glass flex flex-col items-center gap-4 p-8 text-center">
                <Sparkles className="size-6" style={{ color: scoreLabel(result.harmonyScore).color }} />
                <div
                  className="font-display text-6xl font-bold"
                  style={{ color: scoreLabel(result.harmonyScore).color }}
                >
                  {result.harmonyScore}%
                </div>
                <p className="font-display text-xl font-semibold">{scoreLabel(result.harmonyScore).label}</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {result.shared.length} shared song{result.shared.length === 1 ? "" : "s"} out of{" "}
                  {result.shared.length + result.onlyA.length + result.onlyB.length} total.
                </p>

                {result.shared.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {result.shared.slice(0, 6).map((s) => (
                      <img
                        key={s.id}
                        src={proxied(s.artworkUrl)}
                        alt={s.title}
                        title={`${s.title} — ${s.artist}`}
                        className="size-14 rounded-xl object-cover shadow-lg"
                      />
                    ))}
                  </div>
                )}

                <Button className="mt-4" onClick={handleMakeCard}>
                  <Wand2 className="size-4" /> Make a shareable card
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Dna } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useStudioStore } from "@/store/studioStore";

const GENRE_COLORS = [
  "#b06bff",
  "#ff5fa8",
  "#5fc9ff",
  "#ffd35f",
  "#6bffb0",
  "#ff8a5f",
  "#9a9aa8",
];

export default function MusicDna() {
  const songs = useStudioStore((s) => s.songs);

  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const song of songs) {
      const genre = song.genre?.trim();
      if (!genre) continue;
      counts.set(genre, (counts.get(genre) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([genre, count], i) => ({
        genre,
        count,
        color: GENRE_COLORS[i % GENRE_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [songs]);

  const total = breakdown.reduce((sum, b) => sum + b.count, 0);
  if (total < 2) return null;

  const topGenre = breakdown[0];

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Dna className="size-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-muted-foreground">Music DNA</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Your taste leans{" "}
        <span className="font-semibold" style={{ color: topGenre.color }}>
          {topGenre.genre}
        </span>
        .
      </p>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        {breakdown.map((b) => (
          <motion.div
            key={b.genre}
            initial={{ width: 0 }}
            animate={{ width: `${(b.count / total) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ backgroundColor: b.color }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {breakdown.map((b) => (
          <div key={b.genre} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: b.color }} />
            {b.genre} · {Math.round((b.count / total) * 100)}%
          </div>
        ))}
      </div>
    </Card>
  );
}

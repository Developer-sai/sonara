"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { PieChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useStudioStore } from "@/store/studioStore";
import { PROVIDER_META, type MusicProvider } from "@/lib/types";

export default function AuraBreakdown() {
  const songs = useStudioStore((s) => s.songs);
  const elements = useStudioStore((s) => s.elements);

  const uploadedCount = elements.filter(
    (el) => el.type === "image" && !el.songId && el.src.startsWith("data:")
  ).length;

  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const song of songs) {
      counts.set(song.provider, (counts.get(song.provider) || 0) + 1);
    }
    const entries = Array.from(counts.entries()).map(([provider, count]) => ({
      provider: provider as MusicProvider,
      count,
      label: PROVIDER_META[provider as MusicProvider]?.label || provider,
      color: PROVIDER_META[provider as MusicProvider]?.color || "#9A9AA8",
    }));
    if (uploadedCount > 0) {
      entries.push({
        provider: "manual" as MusicProvider,
        count: uploadedCount,
        label: "Your photos",
        color: PROVIDER_META.manual.color,
      });
    }
    return entries.sort((a, b) => b.count - a.count);
  }, [songs, uploadedCount]);

  const total = breakdown.reduce((sum, b) => sum + b.count, 0);
  if (total < 2) return null;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <PieChart className="size-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-muted-foreground">Aura breakdown</h3>
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        {breakdown.map((b) => (
          <motion.div
            key={b.provider}
            initial={{ width: 0 }}
            animate={{ width: `${(b.count / total) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ backgroundColor: b.color }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {breakdown.map((b) => (
          <div key={b.provider} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: b.color }} />
            {b.label} · {Math.round((b.count / total) * 100)}%
          </div>
        ))}
      </div>
    </Card>
  );
}

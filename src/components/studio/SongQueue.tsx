"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useStudioStore } from "@/store/studioStore";
import { proxied } from "@/lib/proxyImage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function SongQueue() {
  const songs = useStudioStore((s) => s.songs);
  const elements = useStudioStore((s) => s.elements);
  const selectedId = useStudioStore((s) => s.selectedId);
  const removeSong = useStudioStore((s) => s.removeSong);
  const setSelectedId = useStudioStore((s) => s.setSelectedId);

  if (songs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
        Your library is empty — search, paste a link, load a demo set, or upload a photo to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-muted-foreground">
        {songs.length} song{songs.length === 1 ? "" : "s"} added — tap one to find it on the canvas
      </div>
      <ScrollArea className="max-h-64">
        <div className="flex flex-col gap-1 pr-2">
          <AnimatePresence initial={false}>
            {songs.map((song) => {
              const el = elements.find((e) => e.type === "image" && e.songId === song.id);
              const active = el && el.id === selectedId;
              return (
                <motion.button
                  key={song.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onClick={() => el && setSelectedId(el.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg p-1.5 text-left transition-colors",
                    active ? "bg-primary/15" : "bg-white/[0.03] hover:bg-white/[0.06]"
                  )}
                >
                  <img
                    src={proxied(song.artworkUrl)}
                    alt=""
                    className="size-8 shrink-0 rounded-md object-cover bg-secondary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{song.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{song.artist}</p>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSong(song.id);
                    }}
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

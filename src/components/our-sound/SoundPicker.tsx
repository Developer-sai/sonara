"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { proxied } from "@/lib/proxyImage";
import type { Song } from "@/lib/types";

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SoundPicker({
  label,
  accent,
  songs,
  onAdd,
  onRemove,
}: {
  label: string;
  accent: string;
  songs: Song[];
  onAdd: (song: Song) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(query, 400);

  useEffect(() => {
    let cancelled = false;
    if (!debounced.trim()) {
      Promise.resolve().then(() => {
        if (!cancelled) setResults([]);
      });
      return () => {
        cancelled = true;
      };
    }
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
        return fetch(`/api/music/search?q=${encodeURIComponent(debounced)}`);
      })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setResults(data.results || []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="font-display text-sm font-semibold">{label}</h3>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a song…"
          className="pl-10"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-xl border border-border/60 p-1">
          {results.slice(0, 8).map((song) => {
            const added = songs.some((s) => s.title === song.title && s.artist === song.artist);
            return (
              <button
                key={song.id}
                disabled={added}
                onClick={() => {
                  onAdd(song);
                  setQuery("");
                }}
                className="flex items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-white/5 disabled:opacity-40"
              >
                <img src={proxied(song.artworkUrl)} alt="" className="size-8 shrink-0 rounded-md object-cover bg-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{song.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{song.artist}</p>
                </div>
                {added ? null : <Plus className="size-3.5 shrink-0 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {songs.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            Add a few songs to build {label.toLowerCase()}.
          </p>
        )}
        {songs.map((song) => (
          <div key={song.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-1.5">
            <img src={proxied(song.artworkUrl)} alt="" className="size-8 shrink-0 rounded-md object-cover bg-secondary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{song.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{song.artist}</p>
            </div>
            <button
              onClick={() => onRemove(song.id)}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

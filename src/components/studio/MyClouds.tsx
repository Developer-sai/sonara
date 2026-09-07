"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, FolderOpen, Pencil, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { useStudioStore } from "@/store/studioStore";
import type { Cloud } from "@/lib/types";

export default function MyClouds() {
  const user = useAuthStore((s) => s.user);
  const loadCloud = useStudioStore((s) => s.loadCloud);
  const savedAt = useStudioStore((s) => s.savedAt);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
        return fetch("/api/clouds");
      })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setClouds(data.clouds || []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, savedAt]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/clouds/${id}`, { method: "DELETE" });
    if (res.ok) {
      setClouds((c) => c.filter((cl) => cl.id !== id));
      toast.success("Deleted.");
    }
  }

  async function handleRename(id: string) {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    const res = await fetch(`/api/clouds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim() }),
    });
    if (res.ok) {
      setClouds((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: editTitle.trim() } : c))
      );
      toast.success("Renamed cloud.");
    } else {
      toast.error("Couldn't rename cloud.");
    }
    setEditingId(null);
  }

  if (!user) return null;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-muted-foreground">My clouds</h3>
        {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
      {clouds.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">Nothing saved yet — build one above and hit Save.</p>
      )}
      <div className="flex flex-col gap-1.5">
        {clouds.map((cloud) => (
          <div
            key={cloud.id}
            className="flex items-center gap-2 rounded-xl border border-border/70 p-2.5"
          >
            {editingId === cloud.id ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(cloud.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="h-7 text-xs"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => handleRename(cloud.id)}>
                  <Check className="size-3 text-emerald-400" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => setEditingId(null)}>
                  <X className="size-3 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{cloud.title || "Untitled aura"}</p>
                  <p className="text-xs text-muted-foreground">
                    {cloud.elements?.length || 0} elements · {cloud.items.length} songs
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  title="Rename"
                  onClick={() => {
                    setEditingId(cloud.id);
                    setEditTitle(cloud.title || "");
                  }}
                >
                  <Pencil className="size-3" />
                </Button>
                <Button size="icon" variant="secondary" className="size-7" title="Open & edit" onClick={() => loadCloud(cloud)}>
                  <FolderOpen className="size-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  title="Delete"
                  onClick={() => handleDelete(cloud.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

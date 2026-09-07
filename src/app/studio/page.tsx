"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Sliders, ListMusic, PlusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import IngestionPanel from "@/components/studio/IngestionPanel";
import EditorToolbar from "@/components/studio/EditorToolbar";
import ElementInspector from "@/components/studio/ElementInspector";
import CustomizationPanel from "@/components/studio/CustomizationPanel";
import SongQueue from "@/components/studio/SongQueue";
import AuraBreakdown from "@/components/studio/AuraBreakdown";
import MusicDna from "@/components/studio/MusicDna";
import ExportBar from "@/components/studio/ExportBar";
import FreeformCanvas, { type FreeformCanvasHandle } from "@/components/studio/FreeformCanvas";
import MyClouds from "@/components/studio/MyClouds";
import CommandPalette from "@/components/studio/CommandPalette";
import { useStudioStore } from "@/store/studioStore";

function StudioQueryHandler() {
  const params = useSearchParams();

  useEffect(() => {
    const err = params.get("connect_error");
    const connected = params.get("connected");
    if (err) toast.error(decodeURIComponent(err));
    if (connected) toast.success(`Connected ${connected.replace("_", " ")}!`);
    if (err || connected) {
      const url = new URL(window.location.href);
      url.searchParams.delete("connect_error");
      url.searchParams.delete("connected");
      window.history.replaceState({}, "", url.toString());
    }
  }, [params]);

  return null;
}

export default function StudioPage() {
  const canvasRef = useRef<FreeformCanvasHandle>(null);
  const [mobileSheet, setMobileSheet] = useState<"add" | "style" | "library" | null>(null);
  const selectedId = useStudioStore((s) => s.selectedId);

  return (
    <div className="aura-field min-h-[calc(100vh-4rem)] pb-28 lg:pb-10">
      <Suspense fallback={null}>
        <StudioQueryHandler />
      </Suspense>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Studio</h1>
            <p className="text-sm text-muted-foreground">
              Drag, resize and rotate anything — then save or export it.
            </p>
          </div>
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="hidden items-center gap-2 rounded-full border border-border/70 px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/5 sm:flex"
          >
            Quick actions
            <kbd className="rounded-md border border-border/70 bg-white/5 px-1.5 py-0.5 font-sans text-[10px]">
              ⌘K
            </kbd>
          </button>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr_300px]">
          <Card className="hidden max-h-[calc(100vh-6rem)] flex-col gap-4 overflow-y-auto p-5 lg:flex">
            <h2 className="font-display text-sm font-semibold text-muted-foreground">Add music</h2>
            <IngestionPanel />
          </Card>

          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-md">
              <EditorToolbar />
            </div>
            <FreeformCanvas ref={canvasRef} className="w-full max-w-md" />
            <div className="w-full max-w-md">
              <ExportBar canvasRef={canvasRef} />
            </div>
            <div className="w-full max-w-md">
              <SongQueue />
            </div>
            <div className="w-full max-w-md">
              <AuraBreakdown />
            </div>
            <div className="w-full max-w-md">
              <MusicDna />
            </div>
            <div className="w-full max-w-md">
              <MyClouds />
            </div>
          </div>

          <Card className="hidden max-h-[calc(100vh-6rem)] flex-col gap-6 overflow-y-auto p-5 lg:flex">
            <div>
              <h2 className="mb-3 font-display text-sm font-semibold text-muted-foreground">
                {selectedId ? "Selected element" : "Background & title"}
              </h2>
              {selectedId ? <ElementInspector canvasRef={canvasRef} /> : <CustomizationPanel />}
            </div>
          </Card>
        </div>
      </div>

      {/* Mobile bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border/70 bg-background/90 p-3 backdrop-blur-xl lg:hidden">
        <Button variant="ghost" className="flex-col gap-1 h-auto py-1.5" onClick={() => setMobileSheet("add")}>
          <PlusCircle className="size-5" />
          <span className="text-[11px]">Add</span>
        </Button>
        <Button variant="ghost" className="flex-col gap-1 h-auto py-1.5" onClick={() => setMobileSheet("style")}>
          <Sliders className="size-5" />
          <span className="text-[11px]">Style</span>
        </Button>
        <Button variant="ghost" className="flex-col gap-1 h-auto py-1.5" onClick={() => setMobileSheet("library")}>
          <ListMusic className="size-5" />
          <span className="text-[11px]">My clouds</span>
        </Button>
      </div>

      <Sheet open={mobileSheet === "add"} onOpenChange={(o) => !o && setMobileSheet(null)}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add music &amp; photos</SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-6">
            <IngestionPanel />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === "style"} onOpenChange={(o) => !o && setMobileSheet(null)}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedId ? "Selected element" : "Background & title"}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-5 pb-6">
            {selectedId ? <ElementInspector canvasRef={canvasRef} /> : <CustomizationPanel />}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === "library"} onOpenChange={(o) => !o && setMobileSheet(null)}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>My clouds</SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-6">
            <MyClouds />
          </div>
        </SheetContent>
      </Sheet>

      <CommandPalette canvasRef={canvasRef} />
    </div>
  );
}

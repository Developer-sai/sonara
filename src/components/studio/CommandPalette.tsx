"use client";

import { useEffect, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ImagePlus,
  Type,
  Download,
  Save,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Layers,
  Sparkles,
  Search,
  Undo2,
  Redo2,
  Video,
  MessageCircle,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useStudioStore, ARRANGE_TEMPLATE_META } from "@/store/studioStore";
import type { ArrangeTemplate } from "@/lib/types";
import type { FreeformCanvasHandle } from "./FreeformCanvas";

export default function CommandPalette({
  canvasRef,
}: {
  canvasRef: RefObject<FreeformCanvasHandle | null>;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const addTextElement = useStudioStore((s) => s.addTextElement);
  const applyTemplate = useStudioStore((s) => s.applyTemplate);
  const setViewZoom = useStudioStore((s) => s.setViewZoom);
  const viewZoom = useStudioStore((s) => s.viewZoom);
  const theme = useStudioStore((s) => s.theme);
  const setTheme = useStudioStore((s) => s.setTheme);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action: () => void) {
    action();
    setOpen(false);
  }

  async function handleDownload() {
    const blob = await canvasRef.current?.exportPng();
    if (!blob) {
      toast.error("Add a photo or text first.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sonara-aura.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast.success("Downloaded — share your aura!");
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No matching command.</CommandEmpty>
        <CommandGroup heading="Edit">
          <CommandItem onSelect={() => run(undo)}>
            <Undo2 /> Undo
            <CommandShortcut>⌘Z</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(redo)}>
            <Redo2 /> Redo
            <CommandShortcut>⌘⇧Z</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Create">
          <CommandItem onSelect={() => run(() => document.getElementById("sonara-upload-input")?.click())}>
            <ImagePlus /> Upload a photo
          </CommandItem>
          <CommandItem onSelect={() => run(() => addTextElement())}>
            <Type /> Add text
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Arrange">
          {(Object.keys(ARRANGE_TEMPLATE_META) as ArrangeTemplate[]).map((key) => (
            <CommandItem key={key} onSelect={() => run(() => applyTemplate(key))}>
              <Layers /> {ARRANGE_TEMPLATE_META[key].label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Background">
          <CommandItem onSelect={() => run(() => setTheme({ backgroundMode: "amoled" }))}>
            <Sparkles /> AMOLED Black
            {theme.backgroundMode === "amoled" && <CommandShortcut>Active</CommandShortcut>}
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme({ backgroundMode: "aura_gradient" }))}>
            <Sparkles /> Aura Gradient
            {theme.backgroundMode === "aura_gradient" && <CommandShortcut>Active</CommandShortcut>}
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme({ backgroundMode: "artwork_blur" }))}>
            <Sparkles /> Artwork Blur
            {theme.backgroundMode === "artwork_blur" && <CommandShortcut>Active</CommandShortcut>}
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme({ backgroundMode: "y2k_chrome" }))}>
            <Sparkles /> Y2K Chrome
            {theme.backgroundMode === "y2k_chrome" && <CommandShortcut>Active</CommandShortcut>}
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="View">
          <CommandItem onSelect={() => run(() => setViewZoom(viewZoom + 0.15))}>
            <ZoomIn /> Zoom in
          </CommandItem>
          <CommandItem onSelect={() => run(() => setViewZoom(viewZoom - 0.15))}>
            <ZoomOut /> Zoom out
          </CommandItem>
          <CommandItem onSelect={() => run(() => setViewZoom(1))}>
            <Maximize /> Reset zoom
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Export">
          <CommandItem onSelect={() => run(handleDownload)}>
            <Download /> Download PNG
            <CommandShortcut>⌘E</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => document.querySelector<HTMLButtonElement>("[data-action=save]")?.click())}>
            <Save /> Save cloud
          </CommandItem>
          <CommandItem onSelect={() => run(() => document.querySelector<HTMLButtonElement>("[data-action=share]")?.click())}>
            <Share2 /> Save &amp; share publicly
          </CommandItem>
          <CommandItem onSelect={() => run(() => document.querySelector<HTMLButtonElement>("[data-action=download-video]")?.click())}>
            <Video /> Download video
          </CommandItem>
          <CommandItem onSelect={() => run(() => document.querySelector<HTMLButtonElement>("[data-action=share-native]")?.click())}>
            <MessageCircle /> Share to WhatsApp &amp; more
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => run(() => router.push("/"))}>
            <Search /> Go to landing page
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

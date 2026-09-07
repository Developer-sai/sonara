"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ImagePlus,
  Type,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Redo2,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useStudioStore } from "@/store/studioStore";
import { ARRANGE_TEMPLATE_META } from "@/store/studioStore";
import type { ArrangeTemplate } from "@/lib/types";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const STICKERS = [
  "❤️", "🔥", "✨", "🎵", "🎶", "💜", "⭐️", "😍",
  "🌙", "💫", "🎧", "🥹", "😭", "💖", "🫶", "👑",
  "🦋", "🌈", "☁️", "💯",
];

export default function EditorToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addImageElement = useStudioStore((s) => s.addImageElement);
  const addTextElement = useStudioStore((s) => s.addTextElement);
  const applyTemplate = useStudioStore((s) => s.applyTemplate);
  const viewZoom = useStudioStore((s) => s.viewZoom);
  const setViewZoom = useStudioStore((s) => s.setViewZoom);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const canUndo = useStudioStore((s) => s.past.length > 0);
  const canRedo = useStudioStore((s) => s.future.length > 0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} isn't an image.`);
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name} is too large (max 12MB).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") addImageElement(reader.result);
      };
      reader.onerror = () => toast.error(`Couldn't read ${file.name}.`);
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/60 p-2">
      <input
        id="sonara-upload-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="size-4" /> Photo
          </Button>
        </TooltipTrigger>
        <TooltipContent>Upload from your device</TooltipContent>
      </Tooltip>

      <Button size="sm" variant="secondary" onClick={() => addTextElement()}>
        <Type className="size-4" /> Text
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="secondary">
            <Smile className="size-4" /> Sticker
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="grid grid-cols-5 gap-1">
            {STICKERS.map((emoji) => (
              <button
                key={emoji}
                onClick={() =>
                  addTextElement({ content: emoji, fontSize: 120, width: 140, height: 140, fontFamily: "sans" })
                }
                className="flex size-11 items-center justify-center rounded-xl text-2xl transition-colors hover:bg-white/8"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="secondary">
            Arrange
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {(Object.keys(ARRANGE_TEMPLATE_META) as ArrangeTemplate[]).map((key) => (
            <DropdownMenuItem key={key} onClick={() => applyTemplate(key)}>
              <div>
                <p className="font-medium">{ARRANGE_TEMPLATE_META[key].label}</p>
                <p className="text-xs text-muted-foreground">{ARRANGE_TEMPLATE_META[key].description}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-6 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" onClick={undo} disabled={!canUndo}>
            <Undo2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo (⌘Z)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" onClick={redo} disabled={!canRedo}>
            <Redo2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
      </Tooltip>

      <div className="mx-1 h-6 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" onClick={() => setViewZoom(viewZoom - 0.15)}>
            <ZoomOut className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom out</TooltipContent>
      </Tooltip>
      <button
        onClick={() => setViewZoom(1)}
        className="min-w-[3.5rem] rounded-full px-2 py-1 text-center text-xs font-medium text-muted-foreground hover:bg-white/5"
      >
        {Math.round(viewZoom * 100)}%
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" onClick={() => setViewZoom(viewZoom + 0.15)}>
            <ZoomIn className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom in</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" onClick={() => setViewZoom(1)}>
            <Maximize className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset zoom</TooltipContent>
      </Tooltip>
    </div>
  );
}

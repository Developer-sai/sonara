"use client";

import { useState, type RefObject } from "react";
import {
  Trash2,
  Copy,
  ChevronsUp,
  ChevronsDown,
  Circle,
  Square,
  RectangleHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  IdCard,
  Rows3,
  Type,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useStudioStore } from "@/store/studioStore";
import type { FontFamilyKey, ImageCanvasElement, TextCanvasElement } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { FreeformCanvasHandle } from "./FreeformCanvas";

const FONT_OPTIONS: { value: FontFamilyKey; label: string; sample: string }[] = [
  { value: "script", label: "Handwritten", sample: "font-script" },
  { value: "display", label: "Display", sample: "font-display" },
  { value: "sans", label: "Clean Sans", sample: "font-sans" },
  { value: "serif", label: "Editorial", sample: "font-serif italic" },
];

const SWATCHES = ["#ffffff", "#0a0a0f", "#b06bff", "#ff5fa8", "#5fc9ff", "#ffd35f", "#ff3b6b"];

/** Instagram's classic "Aa" text-sticker cycle — a color + highlight-band combo. */
const TEXT_PRESETS: { label: string; color: string; backgroundColor: string | null; swatchBg: string }[] = [
  { label: "Classic", color: "#ffffff", backgroundColor: null, swatchBg: "#07070a" },
  { label: "Dark", color: "#0a0a0f", backgroundColor: null, swatchBg: "#ffffff" },
  { label: "White highlight", color: "#0a0a0f", backgroundColor: "#ffffff", swatchBg: "#ffffff" },
  { label: "Black highlight", color: "#ffffff", backgroundColor: "rgba(0,0,0,0.85)", swatchBg: "#0a0a0f" },
  { label: "Aura highlight", color: "#ffffff", backgroundColor: "#b06bff", swatchBg: "#b06bff" },
];

export default function ElementInspector({
  canvasRef,
}: {
  canvasRef: RefObject<FreeformCanvasHandle | null>;
}) {
  const selectedId = useStudioStore((s) => s.selectedId);
  const elements = useStudioStore((s) => s.elements);
  const updateElement = useStudioStore((s) => s.updateElement);
  const el = elements.find((e) => e.id === selectedId);

  if (!el) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Tap a photo or text on the canvas to move, resize, rotate or restyle it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2">
        <Button size="icon" variant="secondary" onClick={() => canvasRef.current?.duplicateSelected()}>
          <Copy className="size-4" />
        </Button>
        <Button size="icon" variant="secondary" onClick={() => canvasRef.current?.bringForwardSelected()}>
          <ChevronsUp className="size-4" />
        </Button>
        <Button size="icon" variant="secondary" onClick={() => canvasRef.current?.sendBackwardSelected()}>
          <ChevronsDown className="size-4" />
        </Button>
        <Button size="icon" variant="destructive" onClick={() => canvasRef.current?.deleteSelected()}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      {el.type === "text" ? (
        <TextInspector el={el} onUpdate={(patch) => updateElement(el.id, patch)} />
      ) : (
        <ImageInspector el={el} onUpdate={(patch) => updateElement(el.id, patch)} />
      )}
    </div>
  );
}

function TextInspector({
  el,
  onUpdate,
}: {
  el: TextCanvasElement;
  onUpdate: (patch: Partial<TextCanvasElement>) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>Text</Label>
        <Textarea value={el.content} onChange={(e) => onUpdate({ content: e.target.value })} rows={2} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Style</Label>
        <div className="flex flex-wrap gap-2">
          {TEXT_PRESETS.map((preset) => {
            const active = el.color === preset.color && (el.backgroundColor || null) === preset.backgroundColor;
            return (
              <button
                key={preset.label}
                title={preset.label}
                onClick={() => onUpdate({ color: preset.color, backgroundColor: preset.backgroundColor })}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-transform hover:scale-110",
                  active ? "border-primary" : "border-white/15"
                )}
                style={{ backgroundColor: preset.swatchBg, color: preset.color }}
              >
                Aa
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Font</Label>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => onUpdate({ fontFamily: f.value })}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                el.fontFamily === f.value
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/70 hover:bg-white/5"
              )}
            >
              <span className={f.sample}>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Size · {Math.round(el.fontSize)}px</Label>
        <Slider
          min={20}
          max={160}
          step={2}
          value={[el.fontSize]}
          onValueChange={([v]) => onUpdate({ fontSize: v })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate({ color: c })}
              className={cn(
                "size-7 rounded-full border-2 transition-transform hover:scale-110",
                el.color === c ? "border-primary" : "border-white/20"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={el.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="size-7 cursor-pointer rounded-full border-2 border-white/20 bg-transparent"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Alignment</Label>
        <ToggleGroup
          type="single"
          value={el.align}
          onValueChange={(v) => v && onUpdate({ align: v as "left" | "center" | "right" })}
          variant="outline"
          className="w-full"
        >
          <ToggleGroupItem value="left" className="flex-1">
            <AlignLeft className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" className="flex-1">
            <AlignCenter className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" className="flex-1">
            <AlignRight className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </>
  );
}

const CARD_STYLE_OPTIONS: {
  value: NonNullable<ImageCanvasElement["cardStyle"]>;
  label: string;
  icon: typeof ImageIcon;
}[] = [
  { value: "artwork", label: "Artwork", icon: ImageIcon },
  { value: "big", label: "Big card", icon: IdCard },
  { value: "small", label: "Small card", icon: Rows3 },
  { value: "text", label: "Just the name", icon: Type },
];

function ImageInspector({
  el,
  onUpdate,
}: {
  el: ImageCanvasElement;
  onUpdate: (patch: Partial<ImageCanvasElement>) => void;
}) {
  const setElementCardStyle = useStudioStore((s) => s.setElementCardStyle);
  const [pendingStyle, setPendingStyle] = useState<string | null>(null);
  const cardStyle = el.cardStyle || "artwork";
  const isPlainPhoto = !el.songId;

  return (
    <>
      {!isPlainPhoto && (
        <div className="flex flex-col gap-1.5">
          <Label>Song card style</Label>
          <div className="grid grid-cols-2 gap-2">
            {CARD_STYLE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = cardStyle === opt.value;
              const loading = pendingStyle === opt.value;
              return (
                <button
                  key={opt.value}
                  disabled={loading}
                  onClick={() => {
                    setPendingStyle(opt.value);
                    setElementCardStyle(el.id, opt.value).finally(() =>
                      setPendingStyle((p) => (p === opt.value ? null : p))
                    );
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-xs transition-colors disabled:opacity-60",
                    active ? "border-primary/60 bg-primary/10" : "border-border/70 hover:bg-white/5"
                  )}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(isPlainPhoto || cardStyle === "artwork") && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>Frame</Label>
            <ToggleGroup
              type="single"
              value={el.frame}
              onValueChange={(v) => v && onUpdate({ frame: v as ImageCanvasElement["frame"] })}
              variant="outline"
              className="w-full"
            >
              <ToggleGroupItem value="none" className="flex-1 flex-col gap-1 py-2 text-xs">
                <RectangleHorizontal className="size-4" /> None
              </ToggleGroupItem>
              <ToggleGroupItem value="polaroid" className="flex-1 flex-col gap-1 py-2 text-xs">
                <Square className="size-4" /> Polaroid
              </ToggleGroupItem>
              <ToggleGroupItem value="circle" className="flex-1 flex-col gap-1 py-2 text-xs">
                <Circle className="size-4" /> Circle
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {el.frame === "none" && (
            <div className="flex flex-col gap-1.5">
              <Label>Corner radius · {Math.round(el.borderRadius)}px</Label>
              <Slider
                min={0}
                max={200}
                step={4}
                value={[el.borderRadius]}
                onValueChange={([v]) => onUpdate({ borderRadius: v })}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}

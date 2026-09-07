"use client";

import { useStudioStore, ASPECT_META } from "@/store/studioStore";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { CloudAspect, FontFamilyKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const FONT_OPTIONS: { value: FontFamilyKey; label: string; sample: string }[] = [
  { value: "script", label: "Handwritten", sample: "font-script" },
  { value: "display", label: "Display", sample: "font-display" },
  { value: "sans", label: "Clean Sans", sample: "font-sans" },
  { value: "serif", label: "Editorial", sample: "font-serif italic" },
];

const BG_OPTIONS = [
  { value: "amoled", label: "AMOLED Black" },
  { value: "aura_gradient", label: "Aura Gradient" },
  { value: "artwork_blur", label: "Artwork Blur" },
  { value: "solid", label: "Solid Color" },
  { value: "y2k_chrome", label: "Y2K Chrome" },
] as const;

export default function CustomizationPanel() {
  const theme = useStudioStore((s) => s.theme);
  const setTheme = useStudioStore((s) => s.setTheme);
  const aspectRatio = useStudioStore((s) => s.aspectRatio);
  const setAspectRatio = useStudioStore((s) => s.setAspectRatio);
  const title = useStudioStore((s) => s.title);
  const subtitle = useStudioStore((s) => s.subtitle);
  const setTitle = useStudioStore((s) => s.setTitle);
  const setSubtitle = useStudioStore((s) => s.setSubtitle);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Subtitle</Label>
        <Input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Optional caption"
          maxLength={80}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Aspect ratio</Label>
        <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as CloudAspect)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ASPECT_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Background</Label>
        <Select
          value={theme.backgroundMode}
          onValueChange={(v) => setTheme({ backgroundMode: v as typeof theme.backgroundMode })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BG_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {theme.backgroundMode === "solid" && (
          <input
            type="color"
            value={theme.solidColor || "#07070a"}
            onChange={(e) => setTheme({ solidColor: e.target.value })}
            className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-border bg-transparent"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Default text style</Label>
        <p className="text-xs text-muted-foreground">Applies to new text you add — each one stays editable.</p>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTheme({ defaultFontFamily: f.value })}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                theme.defaultFontFamily === f.value
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/70 hover:bg-white/5"
              )}
            >
              <span className={f.sample}>{f.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

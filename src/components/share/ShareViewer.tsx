"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "motion/react";
import * as fabric from "fabric";
import { Download, Wand2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { proxied } from "@/lib/proxyImage";
import { drawBackground, loadImageCached } from "@/lib/canvas/core";
import { useStudioStore, ASPECT_META } from "@/store/studioStore";
import { getEditDims } from "@/lib/canvasDims";
import type { Cloud, ImageCanvasElement } from "@/lib/types";

const RENDER_WIDTH = 720;

const FONT_NAMES: Record<string, string> = {
  script: "Caveat",
  display: "Space Grotesk",
  sans: "Outfit",
  serif: "Playfair Display",
};

export default function ShareViewer({ cloud }: { cloud: Cloud }) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fcRef = useRef<fabric.Canvas | null>(null);
  const router = useRouter();
  const loadCloudIntoStudio = useStudioStore((s) => s.loadCloud);
  const [ready, setReady] = useState(false);

  const { w, h } = ASPECT_META[cloud.aspectRatio];
  const renderW = RENDER_WIDTH;
  const renderH = Math.round(RENDER_WIDTH * (h / w));

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    if (!canvasEl) return;
    let cancelled = false;

    const fc = new fabric.Canvas(canvasEl, {
      width: renderW,
      height: renderH,
      backgroundColor: "#07070a",
      selection: false,
    });
    fcRef.current = fc;

    (async () => {
      // Background
      const off = document.createElement("canvas");
      off.width = renderW;
      off.height = renderH;
      const ctx = off.getContext("2d");
      if (ctx) {
        let blurImg: HTMLImageElement | null = null;
        if (cloud.theme.backgroundMode === "artwork_blur") {
          const first = cloud.elements.find((e): e is ImageCanvasElement => e.type === "image");
          if (first) blurImg = await loadImageCached(first.src);
        }
        if (cloud.theme.backgroundMode === "y2k_chrome") {
          const grad = ctx.createLinearGradient(0, 0, renderW, renderH);
          grad.addColorStop(0, "#c9d6e3");
          grad.addColorStop(0.5, "#e8ecf5");
          grad.addColorStop(1, "#c9d6e3");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, renderW, renderH);
        } else {
          drawBackground(
            ctx,
            renderW,
            renderH,
            cloud.theme.backgroundMode,
            [],
            cloud.theme.solidColor,
            blurImg,
            0
          );
        }
        if (!cancelled) {
          const bgUrl = off.toDataURL("image/png");
          const bg = await fabric.FabricImage.fromURL(bgUrl);
          if (!cancelled) {
            fc.backgroundImage = bg;
            fc.requestRenderAll();
          }
        }
      }

      // Elements — read-only
      const { editW } = getEditDims(cloud.aspectRatio);
      const scale = renderW / editW;
      const sorted = [...cloud.elements].sort((a, b) => a.zIndex - b.zIndex);
      for (const el of sorted) {
        if (cancelled) return;
        if (el.type === "image") {
          try {
            const img = await fabric.FabricImage.fromURL(proxied(el.src) || el.src, {
              crossOrigin: "anonymous",
            });
            // Cover-fit (uniform scale + crop), matching the editor — an
            // independent scaleX/scaleY here would stretch/distort any photo
            // whose aspect ratio doesn't already match its box.
            const natW = img.width || el.width;
            const natH = img.height || el.height;
            const boxW = el.width * scale;
            const boxH = el.height * scale;
            const imgScale = Math.max(boxW / natW, boxH / natH) || 1;
            img.set({
              left: el.x * scale,
              top: el.y * scale,
              originX: "center",
              originY: "center",
              angle: el.rotation,
              scaleX: imgScale,
              scaleY: imgScale,
              selectable: false,
              evented: false,
            });
            if (el.frame === "polaroid") {
              img.set({ stroke: "#f7f5ef", strokeWidth: 14 * scale, strokeUniform: true });
            }
            const cropW = boxW / imgScale;
            const cropH = boxH / imgScale;
            if (el.frame === "circle") {
              img.clipPath = new fabric.Circle({
                radius: Math.min(cropW, cropH) / 2,
                originX: "center",
                originY: "center",
              });
            } else {
              img.clipPath = new fabric.Rect({
                width: cropW,
                height: cropH,
                rx: el.frame === "polaroid" ? 0 : el.borderRadius,
                ry: el.frame === "polaroid" ? 0 : el.borderRadius,
                originX: "center",
                originY: "center",
              });
            }
            if (!cancelled) fc.add(img);
          } catch {
            // skip broken images rather than fail the whole render
          }
        } else {
          const tb = new fabric.Textbox(el.content, {
            left: el.x * scale,
            top: el.y * scale,
            originX: "center",
            originY: "center",
            width: el.width * scale,
            angle: el.rotation,
            fontFamily: FONT_NAMES[el.fontFamily] || "Outfit",
            fontSize: el.fontSize * scale,
            fontWeight: el.weight,
            fill: el.color,
            textAlign: el.align,
            textBackgroundColor: el.backgroundColor || "",
            selectable: false,
            evented: false,
          });
          if (!cancelled) fc.add(tb);
        }
      }
      if (!cancelled) {
        fc.requestRenderAll();
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      fc.dispose();
      fcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload() {
    const fc = fcRef.current;
    if (!fc) return;
    const multiplier = w / renderW;
    const blob = await fc.toBlob({ format: "png", multiplier, quality: 1 });
    if (!blob) {
      toast.error("Couldn't export — try again.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cloud.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "sonara-aura"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function handleRemix() {
    loadCloudIntoStudio({ ...cloud, id: "", shareSlug: null });
    useStudioStore.setState({ cloudId: null });
    router.push("/studio");
  }

  return (
    <div className="aura-field flex min-h-[calc(100vh-4rem)] flex-col items-center px-4 py-10 sm:px-6">
      <Link href="/" className="mb-6 flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to SONARA
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2.5 mb-5"
      >
        <Avatar>
          <AvatarImage src={cloud.ownerAvatar || undefined} />
          <AvatarFallback>{(cloud.ownerUsername || "S").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="text-left">
          <p className="text-sm font-medium">@{cloud.ownerUsername}</p>
          <p className="text-xs text-muted-foreground">{cloud.items.length} songs</p>
        </div>
      </motion.div>

      <div
        className="relative mx-auto overflow-hidden rounded-[28px] border border-border/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]"
        style={{ width: renderW, maxWidth: "100%" }}
      >
        <canvas ref={canvasElRef} className="h-auto w-full" />
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={handleDownload} disabled={!ready}>
          <Download className="size-4" /> Download PNG
        </Button>
        <Button variant="secondary" onClick={handleRemix}>
          <Wand2 className="size-4" /> Remix in Studio
        </Button>
      </div>
    </div>
  );
}

"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as fabric from "fabric";
import { Copy, ChevronsUp, ChevronsDown, Trash2, RectangleHorizontal, Square, Circle } from "lucide-react";
import { useStudioStore } from "@/store/studioStore";
import { getEditDims } from "@/lib/canvasDims";
import { proxied } from "@/lib/proxyImage";
import { drawBackground, extractPalette, loadImageCached } from "@/lib/canvas/core";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { CanvasElement, CloudAspect, ImageCanvasElement, TextCanvasElement } from "@/lib/types";

export interface FreeformCanvasHandle {
  exportPng: () => Promise<Blob | null>;
  /** Records a short looping clip of the live canvas (WebM). Returns null if
   *  the browser doesn't support canvas.captureStream()/MediaRecorder. */
  exportVideo: (durationMs?: number) => Promise<Blob | null>;
  canExportVideo: () => boolean;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  bringForwardSelected: () => void;
  sendBackwardSelected: () => void;
}

const FONT_NAMES: Record<string, string> = {
  script: "Caveat",
  display: "Space Grotesk",
  sans: "Outfit",
  serif: "Playfair Display",
};

function editSize(aspectRatio: CloudAspect) {
  return getEditDims(aspectRatio);
}

const FreeformCanvas = forwardRef<FreeformCanvasHandle, { className?: string }>(
  function FreeformCanvas({ className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fcRef = useRef<fabric.Canvas | null>(null);
    const objById = useRef<Map<string, fabric.Object>>(new Map());
    const idByObj = useRef<WeakMap<fabric.Object, string>>(new WeakMap());
    const applyingFromCanvas = useRef(false);
    const guideLines = useRef<fabric.Line[]>([]);

    const aspectRatio = useStudioStore((s) => s.aspectRatio);

    // ---- Mount: create the fabric canvas once per aspect ratio ----
    useEffect(() => {
      const canvasEl = canvasElRef.current;
      if (!canvasEl) return;
      const { editW, editH } = editSize(aspectRatio);

      const fc = new fabric.Canvas(canvasEl, {
        width: editW,
        height: editH,
        backgroundColor: "#07070a",
        preserveObjectStacking: true,
        selection: true,
        stopContextMenu: false,
      });
      fcRef.current = fc;
      objById.current = new Map();

      // Initial load from the store (e.g. a saved cloud, or elements already
      // added while this component briefly unmounted).
      const state = useStudioStore.getState();
      buildElement(fc, [...state.elements].sort((a, b) => a.zIndex - b.zIndex));

      function snapshotFromCanvas() {
        applyingFromCanvas.current = true;
        useStudioStore.getState().pushHistory();
        const elements: CanvasElement[] = [];
        fc.getObjects().forEach((obj, i) => {
          const id = idByObj.current.get(obj);
          if (!id) return;
          const existing = useStudioStore.getState().elements.find((e) => e.id === id);
          if (!existing) return;
          const common = {
            x: obj.left ?? existing.x,
            y: obj.top ?? existing.y,
            width: obj.getScaledWidth(),
            height: obj.getScaledHeight(),
            rotation: obj.angle ?? 0,
            zIndex: i,
          };
          if (existing.type === "text") {
            const tb = obj as fabric.Textbox;
            elements.push({ ...existing, ...common, content: tb.text ?? existing.content });
          } else {
            elements.push({ ...existing, ...common });
          }
        });
        useStudioStore.setState({ elements, isDirty: true });
        queueMicrotask(() => {
          applyingFromCanvas.current = false;
        });
      }

      function handleSelection() {
        const active = fc.getActiveObject();
        const id = active ? idByObj.current.get(active) ?? null : null;
        useStudioStore.setState({ selectedId: id });
      }

      function clearGuides() {
        guideLines.current.forEach((line) => fc.remove(line));
        guideLines.current = [];
      }

      function drawGuide(orientation: "v" | "h", pos: number) {
        const line = new fabric.Line(
          orientation === "v" ? [pos, 0, pos, editH] : [0, pos, editW, pos],
          {
            stroke: "#ff5fa8",
            strokeWidth: 1,
            selectable: false,
            evented: false,
            excludeFromExport: true,
          }
        );
        fc.add(line);
        fc.bringObjectToFront(line);
        guideLines.current.push(line);
      }

      const SNAP_THRESHOLD = 6;

      function snapObject(target: fabric.Object) {
        clearGuides();
        const tw = target.getScaledWidth();
        const th = target.getScaledHeight();
        const tcx = target.left ?? 0;
        const tcy = target.top ?? 0;

        const xCandidates: number[] = [editW / 2];
        const yCandidates: number[] = [editH / 2];
        for (const obj of fc.getObjects()) {
          if (obj === target || !idByObj.current.has(obj)) continue;
          const ow = obj.getScaledWidth();
          const oh = obj.getScaledHeight();
          const ocx = obj.left ?? 0;
          const ocy = obj.top ?? 0;
          xCandidates.push(ocx, ocx - ow / 2, ocx + ow / 2);
          yCandidates.push(ocy, ocy - oh / 2, ocy + oh / 2);
        }

        const myXs = [tcx, tcx - tw / 2, tcx + tw / 2];
        const myYs = [tcy, tcy - th / 2, tcy + th / 2];

        let bestX: { cand: number; offset: number } | null = null;
        let bestXDiff = SNAP_THRESHOLD;
        for (const cand of xCandidates) {
          for (const myX of myXs) {
            const diff = Math.abs(myX - cand);
            if (diff < bestXDiff) {
              bestXDiff = diff;
              bestX = { cand, offset: myX - tcx };
            }
          }
        }

        let bestY: { cand: number; offset: number } | null = null;
        let bestYDiff = SNAP_THRESHOLD;
        for (const cand of yCandidates) {
          for (const myY of myYs) {
            const diff = Math.abs(myY - cand);
            if (diff < bestYDiff) {
              bestYDiff = diff;
              bestY = { cand, offset: myY - tcy };
            }
          }
        }

        if (bestX) {
          target.set("left", bestX.cand - bestX.offset);
          drawGuide("v", bestX.cand);
        }
        if (bestY) {
          target.set("top", bestY.cand - bestY.offset);
          drawGuide("h", bestY.cand);
        }
        target.setCoords();
        fc.requestRenderAll();
      }

      fc.on("object:moving", (opt) => snapObject(opt.target));
      fc.on("mouse:up", clearGuides);
      fc.on("object:modified", snapshotFromCanvas);
      fc.on("text:changed", () => snapshotFromCanvas());
      fc.on("selection:created", handleSelection);
      fc.on("selection:updated", handleSelection);
      fc.on("selection:cleared", () => useStudioStore.setState({ selectedId: null }));
      fc.on("mouse:down", (opt) => {
        const native = opt.e as MouseEvent;
        if (native.button === 2 && opt.target && fc.getActiveObject() !== opt.target) {
          fc.setActiveObject(opt.target);
          fc.requestRenderAll();
        }
      });

      return () => {
        fc.dispose();
        fcRef.current = null;
        objById.current = new Map();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aspectRatio]);

    // ---- Diff-sync: reflect store.elements changes onto the fabric canvas ----
    useEffect(() => {
      const unsub = useStudioStore.subscribe((state, prev) => {
        if (state.elements === prev.elements) return;
        const fc = fcRef.current;
        if (!fc) return;

        const currentIds = new Set(state.elements.map((e) => e.id));
        // Removed
        for (const [id, obj] of objById.current) {
          if (!currentIds.has(id)) {
            fc.remove(obj);
            objById.current.delete(id);
          }
        }
        // Added
        const toAdd = state.elements.filter((e) => !objById.current.has(e.id));
        if (toAdd.length) buildElement(fc, toAdd);

        // Updated (only when the change didn't originate from the canvas itself)
        if (!applyingFromCanvas.current) {
          for (const el of state.elements) {
            const obj = objById.current.get(el.id);
            if (!obj) continue;
            applyElementProps(obj, el);
          }
          fc.requestRenderAll();
        }
      });
      return unsub;
      // buildElement/applyElementProps close over stable refs only — safe to omit.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- Selecting a library row should highlight it on the canvas too ----
    useEffect(() => {
      const unsub = useStudioStore.subscribe((state, prev) => {
        if (state.selectedId === prev.selectedId) return;
        const fc = fcRef.current;
        if (!fc) return;
        const active = fc.getActiveObject();
        const activeId = active ? idByObj.current.get(active) : null;
        if (activeId === state.selectedId) return; // already reflects a canvas-originated selection
        if (state.selectedId) {
          const obj = objById.current.get(state.selectedId);
          if (obj) fc.setActiveObject(obj);
        } else {
          fc.discardActiveObject();
        }
        fc.requestRenderAll();
      });
      return unsub;
    }, []);

    function buildElement(fc: fabric.Canvas, elements: CanvasElement[]) {
      elements.forEach(async (el) => {
        let obj: fabric.Object | null = null;
        if (el.type === "image") {
          try {
            const img = await fabric.FabricImage.fromURL(proxied(el.src) || el.src, {
              crossOrigin: "anonymous",
            });
            img.set({
              left: el.x,
              top: el.y,
              originX: "center",
              originY: "center",
              angle: el.rotation,
              scaleX: el.width / (img.width || el.width),
              scaleY: el.height / (img.height || el.height),
            });
            applyFrameStroke(img, el.frame);
            img.clipPath = imageClipPath(el.frame, el.borderRadius, img.width || el.width, img.height || el.height);
            obj = img;
          } catch {
            return;
          }
        } else {
          const tb = new fabric.Textbox(el.content, {
            left: el.x,
            top: el.y,
            originX: "center",
            originY: "center",
            width: el.width,
            angle: el.rotation,
            fontFamily: FONT_NAMES[el.fontFamily] || "Outfit",
            fontSize: el.fontSize,
            fontWeight: el.weight,
            fill: el.color,
            textAlign: el.align,
            textBackgroundColor: el.backgroundColor || "",
            editable: true,
          });
          obj = tb;
        }
        if (!obj || !fcRef.current) return;
        idByObj.current.set(obj, el.id);
        objById.current.set(el.id, obj);
        fcRef.current.add(obj);
        fcRef.current.requestRenderAll();
      });
    }

    function imageClipPath(
      frame: ImageCanvasElement["frame"],
      radius: number,
      w: number,
      h: number
    ): fabric.Object | undefined {
      if (frame === "circle") {
        return new fabric.Circle({
          radius: Math.min(w, h) / 2,
          originX: "center",
          originY: "center",
        });
      }
      if (frame === "polaroid" || !radius) return undefined;
      return new fabric.Rect({
        width: w,
        height: h,
        rx: radius,
        ry: radius,
        originX: "center",
        originY: "center",
      });
    }

    function applyFrameStroke(img: fabric.FabricImage, frame: ImageCanvasElement["frame"]) {
      if (frame === "polaroid") {
        img.set({ stroke: "#f7f5ef", strokeWidth: 14, strokeUniform: true });
      } else {
        img.set({ stroke: undefined, strokeWidth: 0 });
      }
    }

    function applyElementProps(obj: fabric.Object, el: CanvasElement) {
      obj.set({
        left: el.x,
        top: el.y,
        angle: el.rotation,
      });
      if (el.type === "image") {
        const img = obj as fabric.FabricImage;
        const wantSrc = proxied(el.src) || el.src;
        if (img.getSrc() !== wantSrc) {
          img.setSrc(wantSrc, { crossOrigin: "anonymous" }).then(() => {
            img.set({
              scaleX: el.width / (img.width || el.width),
              scaleY: el.height / (img.height || el.height),
            });
            applyFrameStroke(img, el.frame);
            img.clipPath = imageClipPath(el.frame, el.borderRadius, img.width || el.width, img.height || el.height);
            img.setCoords();
            fcRef.current?.requestRenderAll();
          });
        } else {
          img.set({
            scaleX: el.width / (img.width || el.width),
            scaleY: el.height / (img.height || el.height),
          });
          applyFrameStroke(img, el.frame);
          img.clipPath = imageClipPath(el.frame, el.borderRadius, img.width || el.width, img.height || el.height);
        }
      } else {
        const tb = obj as fabric.Textbox;
        if (tb.text !== el.content) tb.set({ text: el.content });
        tb.set({
          width: el.width,
          fontFamily: FONT_NAMES[el.fontFamily] || "Outfit",
          fontSize: el.fontSize,
          fontWeight: el.weight,
          fill: el.color,
          textAlign: el.align,
          textBackgroundColor: el.backgroundColor || "",
        });
      }
      obj.setCoords();
    }

    // ---- Background layer ----
    // Drawn onto a persistent offscreen <canvas> wrapped once in a FabricImage.
    // Canvas-sourced images are "live" — Fabric re-samples current pixels on
    // every render, so animated modes (aura_gradient) just redraw onto the
    // same canvas each tick instead of re-encoding/re-decoding a PNG, which
    // would be far too slow to sustain smooth motion (and is what feeds the
    // "Download Video" recorder its motion too).
    useEffect(() => {
      let cancelled = false;
      let rafId: number | null = null;
      const { editW, editH } = editSize(aspectRatio);
      const bgCanvas = document.createElement("canvas");
      bgCanvas.width = editW;
      bgCanvas.height = editH;
      const bgCtx = bgCanvas.getContext("2d");
      const mountTime = Date.now();

      let lastImageSrcForBlur: string | null = null;
      let lastImageSrcForPalette: string | null = null;
      let blurImgCache: HTMLImageElement | null = null;

      async function repaint(time: number) {
        const fc = fcRef.current;
        if (!fc || !bgCtx || cancelled) return;
        const { theme, elements } = useStudioStore.getState();
        const firstImage = elements.find((e): e is ImageCanvasElement => e.type === "image");

        if (theme.backgroundMode === "artwork_blur" && firstImage?.src !== lastImageSrcForBlur) {
          lastImageSrcForBlur = firstImage?.src ?? null;
          blurImgCache = firstImage ? await loadImageCached(firstImage.src) : null;
          if (cancelled) return;
        }
        if (theme.backgroundMode === "aura_gradient" && firstImage && firstImage.src !== lastImageSrcForPalette) {
          lastImageSrcForPalette = firstImage.src;
          const img = await loadImageCached(firstImage.src);
          if (cancelled) return;
          if (img) {
            const extracted = extractPalette(img, 4);
            if (extracted.length) useStudioStore.getState().setPalette(extracted);
          }
        }
        if (cancelled) return;

        if (theme.backgroundMode === "y2k_chrome") {
          paintY2kBackground(bgCtx, editW, editH, time);
        } else {
          drawBackground(
            bgCtx,
            editW,
            editH,
            theme.backgroundMode,
            useStudioStore.getState().palette,
            theme.solidColor,
            blurImgCache,
            time
          );
        }

        if (!fc.backgroundImage) {
          fc.backgroundImage = new fabric.FabricImage(bgCanvas, {
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
          });
        }
        fc.requestRenderAll();
      }

      const unsub = useStudioStore.subscribe((state, prev) => {
        if (state.theme !== prev.theme || state.palette !== prev.palette) {
          repaint(Date.now() - mountTime);
        }
      });

      repaint(0);

      function loop() {
        if (cancelled) return;
        const mode = useStudioStore.getState().theme.backgroundMode;
        if (mode === "aura_gradient" || mode === "y2k_chrome") {
          repaint(Date.now() - mountTime);
        }
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);

      return () => {
        cancelled = true;
        unsub();
        if (rafId) cancelAnimationFrame(rafId);
      };
    }, [aspectRatio]);

    function deleteSelected() {
      const fc = fcRef.current;
      const active = fc?.getActiveObject();
      if (!fc || !active) return;
      const id = idByObj.current.get(active);
      fc.remove(active);
      fc.discardActiveObject();
      fc.requestRenderAll();
      if (id) useStudioStore.getState().removeElement(id);
    }

    function duplicateSelected() {
      const id = useStudioStore.getState().selectedId;
      if (id) useStudioStore.getState().duplicateElement(id);
    }

    function bringForwardSelected() {
      const id = useStudioStore.getState().selectedId;
      const fc = fcRef.current;
      const obj = id ? objById.current.get(id) : null;
      if (id && fc && obj) {
        fc.bringObjectToFront(obj);
        fc.requestRenderAll();
        useStudioStore.getState().bringForward(id);
      }
    }

    function sendBackwardSelected() {
      const id = useStudioStore.getState().selectedId;
      const fc = fcRef.current;
      const obj = id ? objById.current.get(id) : null;
      if (id && fc && obj) {
        fc.sendObjectToBack(obj);
        fc.requestRenderAll();
        useStudioStore.getState().sendBackward(id);
      }
    }

    useImperativeHandle(ref, () => ({
      exportPng: async () => {
        const fc = fcRef.current;
        if (!fc) return null;
        const { multiplier } = editSize(aspectRatio);
        fc.discardActiveObject();
        fc.requestRenderAll();
        return fc.toBlob({ format: "png", multiplier, quality: 1 });
      },
      canExportVideo: () =>
        typeof window !== "undefined" &&
        typeof HTMLCanvasElement.prototype.captureStream === "function" &&
        typeof window.MediaRecorder !== "undefined",
      exportVideo: async (durationMs = 4000) => {
        const fc = fcRef.current;
        if (!fc) return null;
        const canvasEl = fc.lowerCanvasEl;
        if (typeof canvasEl.captureStream !== "function" || typeof MediaRecorder === "undefined") {
          return null;
        }
        fc.discardActiveObject();
        fc.requestRenderAll();

        const stream = canvasEl.captureStream(30);
        const mimeCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
        const mimeType = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        return new Promise<Blob | null>((resolve) => {
          recorder.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            resolve(chunks.length ? new Blob(chunks, { type: mimeType || "video/webm" }) : null);
          };
          recorder.onerror = () => {
            stream.getTracks().forEach((t) => t.stop());
            resolve(null);
          };
          recorder.start();
          setTimeout(() => {
            if (recorder.state !== "inactive") recorder.stop();
          }, durationMs);
        });
      },
      deleteSelected,
      duplicateSelected,
      bringForwardSelected,
      sendBackwardSelected,
    }));

    const viewZoom = useStudioStore((s) => s.viewZoom);
    const selectedId = useStudioStore((s) => s.selectedId);
    const selectedElement = useStudioStore((s) => s.elements.find((el) => el.id === s.selectedId));
    const updateElement = useStudioStore((s) => s.updateElement);
    const { editW, editH } = editSize(aspectRatio);

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={containerRef}
            className={cn("relative mx-auto overflow-auto no-scrollbar", className)}
            style={{ maxHeight: "min(70vh, 720px)" }}
          >
            <div
              className="mx-auto flex items-center justify-center"
              style={{ width: editW * viewZoom, height: editH * viewZoom }}
            >
              <div
                style={{
                  width: editW,
                  height: editH,
                  transform: `scale(${viewZoom})`,
                  transformOrigin: "center",
                }}
                className="overflow-hidden rounded-[20px] border border-border/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]"
              >
                <canvas ref={canvasElRef} />
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {selectedId ? (
            <>
              <ContextMenuItem onSelect={duplicateSelected}>
                <Copy /> Duplicate
                <ContextMenuShortcut>⌘D</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem onSelect={bringForwardSelected}>
                <ChevronsUp /> Bring to front
              </ContextMenuItem>
              <ContextMenuItem onSelect={sendBackwardSelected}>
                <ChevronsDown /> Send to back
              </ContextMenuItem>
              {selectedElement?.type === "image" && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => updateElement(selectedId, { frame: "none" })}>
                    <RectangleHorizontal /> No frame
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => updateElement(selectedId, { frame: "polaroid" })}>
                    <Square /> Polaroid frame
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => updateElement(selectedId, { frame: "circle" })}>
                    <Circle /> Circle frame
                  </ContextMenuItem>
                </>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem variant="destructive" onSelect={deleteSelected}>
                <Trash2 /> Delete
                <ContextMenuShortcut>⌫</ContextMenuShortcut>
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem disabled>Right-click a photo or text to edit it</ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

function paintY2kBackground(ctx: CanvasRenderingContext2D, width: number, height: number, time = 0) {
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#c9d6e3");
  grad.addColorStop(0.25, "#8fa3c7");
  grad.addColorStop(0.5, "#e8ecf5");
  grad.addColorStop(0.75, "#9fb0d8");
  grad.addColorStop(1, "#c9d6e3");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 30; i++) {
    const sx = (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1;
    const sy = (((Math.sin(i * 78.233) * 12345.6789) % 1) + 1) % 1;
    const x = sx * width;
    const y = sy * height;
    const s = 1.2 + ((i * 37) % 4);
    ctx.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(time / 900 + i));
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export default FreeformCanvas;
export type { CanvasElement, ImageCanvasElement, TextCanvasElement };

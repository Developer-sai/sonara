import { loadImageCached, extractPalette } from "@/lib/canvas/core";
import { PROVIDER_META, type Song } from "@/lib/types";

export type SongCardStyle = "artwork" | "big" | "small" | "text";

export interface RenderedCard {
  src: string;
  width: number;
  height: number;
}

const DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2.5) : 2;

function makeCanvas(logicalW: number, logicalH: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(logicalW * DPR));
  canvas.height = Math.max(1, Math.ceil(logicalH * DPR));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);
  return { canvas, ctx };
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/** A dark "card surface" floor for the footer — extracted palette colors
 *  from moody artwork are often already near-black, and darkening those
 *  further would make the footer visually disappear into the canvas's own
 *  near-black AMOLED background (#07070a). Flooring each channel here keeps
 *  the card readable as a distinct surface no matter how dark the source
 *  art is, while still tinting toward its hue when the art is brighter. */
const FOOTER_FLOOR = { r: 26, g: 23, b: 30 };

function shade(hex: string, percent: number) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16) || 0x2a2438;
  const factor = Math.min(2, Math.max(0, 1 + percent / 100));
  const scale = (c: number, floor: number) =>
    percent < 0 ? Math.max(floor, Math.round(c * factor)) : Math.round(Math.min(255, c * factor));
  const r = scale((num >> 16) & 255, FOOTER_FLOOR.r);
  const g = scale((num >> 8) & 255, FOOTER_FLOOR.g);
  const b = scale(num & 255, FOOTER_FLOOR.b);
  return `rgb(${r},${g},${b})`;
}

async function ensureFonts() {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load("800 32px Outfit"),
      document.fonts.load("700 18px Outfit"),
      document.fonts.load("500 16px Outfit"),
    ]);
    await document.fonts.ready;
  } catch {
    // best-effort — fall back to whatever font is already available
  }
}

async function renderBigCard(song: Song): Promise<RenderedCard> {
  const W = 560;
  const artH = 560;
  const footerH = 150;
  const H = artH + footerH;
  const radius = 26;
  const { canvas, ctx } = makeCanvas(W, H);

  const img = await loadImageCached(song.artworkUrl);
  const palette = img ? extractPalette(img, 3) : [];
  const base = palette[0] || "#1c1526";

  roundedRectPath(ctx, 0, 0, W, H, radius);
  ctx.save();
  ctx.clip();

  if (img) {
    const scale = Math.max(W / img.width, artH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (W - dw) / 2, (artH - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = shade(base, -20);
    ctx.fillRect(0, 0, W, artH);
  }

  const grad = ctx.createLinearGradient(0, artH, 0, H);
  grad.addColorStop(0, shade(base, -58));
  grad.addColorStop(1, shade(base, -72));
  ctx.fillStyle = grad;
  ctx.fillRect(0, artH, W, footerH);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, artH, W, 2);

  const padX = 30;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 28px Outfit, sans-serif";
  ctx.fillText(truncate(ctx, song.title, W - padX * 2), padX, artH + 52);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "500 17px Outfit, sans-serif";
  ctx.fillText(truncate(ctx, song.artist, W - padX * 2), padX, artH + 78);

  const meta = PROVIDER_META[song.provider];
  const label = meta.label.toUpperCase();
  ctx.font = "700 11px Outfit, sans-serif";
  const labelW = ctx.measureText(label).width;
  const dotR = 4;
  const tagPadX = 12;
  const tagH = 26;
  const tagW = dotR * 2 + 8 + labelW + tagPadX * 2;
  const tagX = padX;
  const tagY = H - tagH - 22;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  roundedRectPath(ctx, tagX, tagY, tagW, tagH, tagH / 2);
  ctx.fill();
  ctx.fillStyle = meta.color;
  ctx.beginPath();
  ctx.arc(tagX + tagPadX + dotR, tagY + tagH / 2, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.textBaseline = "middle";
  ctx.fillText(label, tagX + tagPadX + dotR * 2 + 8, tagY + tagH / 2 + 1);

  ctx.restore();

  return { src: canvas.toDataURL("image/png"), width: W, height: H };
}

async function renderSmallCard(song: Song): Promise<RenderedCard> {
  const W = 480;
  const H = 100;
  const radius = 22;
  const { canvas, ctx } = makeCanvas(W, H);

  roundedRectPath(ctx, 0, 0, W, H, radius);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(10,10,14,0.86)";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  roundedRectPath(ctx, 1, 1, W - 2, H - 2, radius);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const pad = 13;
  const thumb = H - pad * 2;
  const img = await loadImageCached(song.artworkUrl);
  ctx.save();
  roundedRectPath(ctx, pad, pad, thumb, thumb, 14);
  ctx.clip();
  if (img) {
    const scale = Math.max(thumb / img.width, thumb / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, pad - (dw - thumb) / 2, pad - (dh - thumb) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#2a2333";
    ctx.fillRect(pad, pad, thumb, thumb);
  }
  ctx.restore();

  const meta = PROVIDER_META[song.provider];
  const textX = pad + thumb + 18;
  const maxTextW = W - textX - 20;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 20px Outfit, sans-serif";
  ctx.fillText(truncate(ctx, song.title, maxTextW), textX, H / 2 - 4);

  ctx.fillStyle = meta.color;
  ctx.beginPath();
  ctx.arc(textX + 4, H / 2 + 15, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "500 15px Outfit, sans-serif";
  ctx.fillText(truncate(ctx, song.artist, maxTextW - 14), textX + 12, H / 2 + 20);

  return { src: canvas.toDataURL("image/png"), width: W, height: H };
}

function renderTextCard(song: Song): RenderedCard {
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d")!;
  const titleFont = "800 34px Outfit, sans-serif";
  const artistFont = "500 19px Outfit, sans-serif";
  measureCtx.font = titleFont;
  const titleW = measureCtx.measureText(song.title).width;
  measureCtx.font = artistFont;
  const artistW = measureCtx.measureText(song.artist).width;

  const padX = 6;
  const W = Math.max(120, Math.ceil(Math.max(titleW, artistW) + padX * 2));
  const H = 92;
  const { canvas, ctx } = makeCanvas(W, H);

  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = "#ffffff";
  ctx.font = titleFont;
  ctx.fillText(song.title, padX, 38);

  ctx.shadowBlur = 6;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = artistFont;
  ctx.fillText(song.artist, padX, 64);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const meta = PROVIDER_META[song.provider];
  ctx.fillStyle = meta.color;
  ctx.fillRect(padX, 74, Math.min(56, W - padX * 2), 3);

  return { src: canvas.toDataURL("image/png"), width: W, height: H };
}

export async function renderSongCard(
  song: Song,
  style: SongCardStyle
): Promise<RenderedCard | null> {
  if (style === "artwork") {
    const img = await loadImageCached(song.artworkUrl);
    return { src: song.artworkUrl, width: img?.width || 800, height: img?.height || 800 };
  }
  try {
    await ensureFonts();
    if (style === "big") return await renderBigCard(song);
    if (style === "small") return await renderSmallCard(song);
    return renderTextCard(song);
  } catch (err) {
    console.error("[songCard] render failed", err);
    return null;
  }
}

import { proxied } from "@/lib/proxyImage";

const imageCache = new Map<string, HTMLImageElement>();
const failedUrls = new Set<string>();

export function loadImageCached(url: string): Promise<HTMLImageElement | null> {
  if (!url || failedUrls.has(url)) return Promise.resolve(null);
  const cached = imageCache.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      failedUrls.add(url);
      resolve(null);
    };
    img.src = proxied(url);
  });
}

export function extractPalette(img: HTMLImageElement, count = 4): string[] {
  try {
    const c = document.createElement("canvas");
    const size = 48;
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 200) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max - min < 12 && (max < 40 || max > 235)) continue; // skip near gray/black/white
      const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
      const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n += 1;
      buckets.set(key, bucket);
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => b.n - a.n);
    const colors = sorted
      .slice(0, count)
      .map((b) => rgbToHex(Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)));

    while (colors.length < count) {
      colors.push(colors[colors.length % Math.max(colors.length, 1)] || "#b06bff");
    }
    return colors;
  } catch {
    return [];
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: "amoled" | "aura_gradient" | "artwork_blur" | "solid",
  palette: string[],
  solidColor: string | undefined,
  blurImg: HTMLImageElement | null,
  time: number
) {
  ctx.clearRect(0, 0, width, height);

  if (mode === "solid") {
    ctx.fillStyle = solidColor || "#07070a";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (mode === "artwork_blur" && blurImg) {
    ctx.save();
    ctx.filter = "blur(60px) brightness(0.45) saturate(1.3)";
    const scale = Math.max(width / blurImg.width, height / blurImg.height) * 1.15;
    const dw = blurImg.width * scale;
    const dh = blurImg.height * scale;
    ctx.drawImage(blurImg, (width - dw) / 2, (height - dh) / 2, dw, dh);
    ctx.restore();
    ctx.fillStyle = "rgba(4,4,8,0.35)";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // amoled base
  ctx.fillStyle = "#07070a";
  ctx.fillRect(0, 0, width, height);

  if (mode === "aura_gradient") {
    const drift = Math.sin(time / 4000) * 0.06;
    const colors = palette.length ? palette : ["#b06bff", "#ff5fa8", "#5fc9ff", "#ffd35f"];
    const blobs: [number, number, number, string][] = [
      [width * (0.22 + drift), height * 0.22, width * 0.55, colors[0]],
      [width * (0.8 - drift), height * 0.18, width * 0.5, colors[1 % colors.length]],
      [width * 0.5, height * (0.92 + drift), width * 0.65, colors[2 % colors.length]],
    ];
    for (const [cx, cy, r, color] of blobs) {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, hexToRgba(color, 0.55));
      grad.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(3,3,6,0.18)";
    ctx.fillRect(0, 0, width, height);
  }
}

export function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}


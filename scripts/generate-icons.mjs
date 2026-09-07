import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const outDir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

function svgIcon({ size, padding = 0 }) {
  const inner = size - padding * 2;
  const r = inner * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#b06bff"/>
        <stop offset="0.55" stop-color="#ff5fa8"/>
        <stop offset="1" stop-color="#5fc9ff"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="#07070a"/>
    <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${r}" fill="url(#g)"/>
    <g transform="translate(${size / 2}, ${size / 2})">
      <circle r="${inner * 0.09}" cy="${inner * 0.16}" cx="${-inner * 0.14}" fill="#07070a"/>
      <circle r="${inner * 0.09}" cy="${-inner * 0.02}" cx="${inner * 0.16}" fill="#07070a"/>
      <rect x="${inner * 0.115}" y="${-inner * 0.28}" width="${inner * 0.045}" height="${inner * 0.34}" rx="${inner * 0.02}" fill="#07070a"/>
      <rect x="${-inner * 0.185}" y="${-inner * 0.2}" width="${inner * 0.045}" height="${inner * 0.36}" rx="${inner * 0.02}" fill="#07070a"/>
      <path d="M ${-inner * 0.185} ${-inner * 0.2} Q ${0} ${-inner * 0.34} ${inner * 0.115} ${-inner * 0.28}" stroke="#07070a" stroke-width="${inner * 0.045}" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;
}

const targets = [
  { name: "icon-192.png", size: 192, padding: 0 },
  { name: "icon-512.png", size: 512, padding: 0 },
  { name: "icon-maskable-512.png", size: 512, padding: 64 },
  { name: "apple-touch-icon.png", size: 180, padding: 14 },
];

for (const t of targets) {
  const svg = Buffer.from(svgIcon({ size: t.size, padding: t.padding }));
  await sharp(svg).png().toFile(path.join(outDir, t.name));
  console.log("Generated", t.name);
}

// favicon.ico replacement (32x32 png works fine for modern browsers referenced via manifest/icons)
const faviconSvg = Buffer.from(svgIcon({ size: 64, padding: 0 }));
await sharp(faviconSvg).resize(32, 32).png().toFile(path.join(process.cwd(), "public", "favicon.png"));
console.log("Generated favicon.png");

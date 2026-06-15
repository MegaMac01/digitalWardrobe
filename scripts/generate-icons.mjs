import sharp from "sharp";
import { mkdirSync } from "node:fs";

// Brand app icon: cream clothes hanger on the vintage-brown background.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#6f4b32"/>
  <g fill="none" stroke="#f5eddc" stroke-width="24" stroke-linecap="round" stroke-linejoin="round">
    <path d="M256 196 c0 -34 -24 -50 -44 -38 c-13 8 -15 23 -5 33"/>
    <path d="M256 196 L150 312 q-9 12 5 16 L357 328 q14 -4 5 -16 Z"/>
  </g>
</svg>`;

const buf = Buffer.from(svg);
mkdirSync("public/icons", { recursive: true });

const targets = [
  { size: 192, file: "public/icons/icon-192.png" },
  { size: 512, file: "public/icons/icon-512.png" },
  { size: 512, file: "public/icons/maskable-512.png" },
  { size: 180, file: "public/icons/apple-touch-icon.png" },
];

for (const { size, file } of targets) {
  await sharp(buf).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}

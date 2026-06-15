import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

// Renders the app icons from a single square source image.
// Drop your icon at public/icons/icon-source.png (ideally 1024x1024) and run:
//   node scripts/generate-icons.mjs
const source = readFileSync("public/icons/icon-source.png");

mkdirSync("public/icons", { recursive: true });

const targets = [
  { size: 192, file: "public/icons/icon-192.png" },
  { size: 512, file: "public/icons/icon-512.png" },
  { size: 512, file: "public/icons/maskable-512.png" },
  { size: 180, file: "public/icons/apple-touch-icon.png" },
];

for (const { size, file } of targets) {
  await sharp(source).resize(size, size, { fit: "cover" }).png().toFile(file);
  console.log("wrote", file);
}

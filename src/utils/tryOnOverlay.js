import { TYPE_ROLE } from "./outfitEngine";

// The try-on models can't render shoes or hats, so we paste those cutouts onto
// the generated image — roughly: hat near the head (top), shoes near the feet
// (bottom). It's approximate, as requested. Cutouts are loaded cross-origin for
// canvas use, so this needs Storage CORS; if a cutout can't be loaded it's just
// skipped (no crash, no overlay for that piece).
function loadImage(src, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function overlayAccessories(baseBlob, items) {
  const footwear = items.find((it) => TYPE_ROLE[it.type] === "footwear");
  const hat = items.find((it) => it.type === "Hat");
  if (!footwear && !hat) return baseBlob;

  const baseUrl = URL.createObjectURL(baseBlob);
  try {
    const base = await loadImage(baseUrl, false);
    const canvas = document.createElement("canvas");
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(base, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    // widthFrac: size relative to image width. top: anchor near the head;
    // otherwise anchor at the feet. Kept small so pieces sit on the body
    // rather than covering it.
    const place = async (item, widthFrac, top) => {
      try {
        const img = await loadImage(item.imageUrl, true);
        const dw = w * widthFrac;
        const dh = dw * (img.naturalHeight / img.naturalWidth || 1);
        const dy = top ? 0 : h - dh;
        ctx.drawImage(img, (w - dw) / 2, dy, dw, dh);
      } catch {
        /* cutout unavailable (e.g. CORS) — skip it */
      }
    };

    if (hat) await place(hat, 0.2, true);
    if (footwear) await place(footwear, 0.26, false);

    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } catch {
    return baseBlob; // base failed to load — return the original
  } finally {
    URL.revokeObjectURL(baseUrl);
  }
}

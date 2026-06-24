// Bounding box of non-transparent pixels (the subject) within a canvas context.
function alphaBounds(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w, h }; // nothing opaque — use whole image
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Cut the person out, then scale + center them into a fixed portrait frame on a
// clean background, so every uploaded photo yields a consistent, centered input
// for the try-on model. Falls back to a plain resize if removal fails.
export async function prepareTryOnPhoto(
  file,
  {
    name = "model.jpg",
    targetW = 768,
    targetH = 1024,
    background = "#ffffff",
    padding = 0.06, // fraction of frame left as margin around the person
    quality = 0.92,
    scanMax = 1024, // cap the working canvas for a fast alpha scan
  } = {}
) {
  let cutout;
  try {
    const { removeBackground } = await import("@imgly/background-removal");
    cutout = await removeBackground(file);
  } catch {
    return resizeImage(file, { name, maxDimension: Math.max(targetW, targetH), quality });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(cutout);
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Work canvas: cutout scaled down — fast to scan and good enough as source.
      const wScale = Math.min(1, scanMax / Math.max(img.naturalWidth, img.naturalHeight));
      const ww = Math.max(1, Math.round(img.naturalWidth * wScale));
      const wh = Math.max(1, Math.round(img.naturalHeight * wScale));
      const work = document.createElement("canvas");
      work.width = ww;
      work.height = wh;
      const wctx = work.getContext("2d", { willReadFrequently: true });
      wctx.drawImage(img, 0, 0, ww, wh);
      const b = alphaBounds(wctx, ww, wh);

      // Target frame: solid background, person fit-scaled + centered with margin.
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, targetW, targetH);
      const scale = Math.min((targetW * (1 - 2 * padding)) / b.w, (targetH * (1 - 2 * padding)) / b.h);
      const destW = b.w * scale;
      const destH = b.h * scale;
      const dx = (targetW - destW) / 2;
      const dy = (targetH - destH) / 2;
      ctx.drawImage(work, b.x, b.y, b.w, b.h, dx, dy, destW, destH);

      canvas.toBlob(
        (out) => resolve(new File([out], name, { type: "image/jpeg" })),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read cutout"));
    };
    img.src = url;
  });
}

// Downscale an image File to a JPEG via canvas, preserving aspect ratio.
// Used for the try-on full-body photo (kept larger for try-on quality).
export function resizeImage(file, { name = "image.jpg", maxDimension = 1024, quality = 0.9 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], name, { type: "image/jpeg" })),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

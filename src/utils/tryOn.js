import { Client, handle_file } from "@gradio/client";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { functions, storage } from "../firebase";
import { itemForRole, TYPE_ROLE } from "./outfitEngine";
import { getTryOnMode, getTryOnServerUrl } from "./tryOnServer";
import { overlayAccessories } from "./tryOnOverlay";

const callTryOn = httpsCallable(functions, "tryOnOutfit", { timeout: 540000 });

// Garments the model can apply: a dress alone, otherwise top then bottom.
// Shoes/hats aren't model-rendered — they're pasted on afterward (overlay).
export function tryOnItems(items) {
  const dress = itemForRole(items, ["onepiece"]);
  if (dress) return [dress];
  const ordered = [];
  const top = itemForRole(items, ["outer", "mid", "base"]);
  const bottom = itemForRole(items, ["bottom"]);
  if (top) ordered.push(top);
  if (bottom) ordered.push(bottom);
  return ordered;
}

// --- caching (Storage), keyed by person photo + applied garments ------------
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function tryOnCacheKey(personUrl, items) {
  const ids = tryOnItems(items).map((item) => item.id);
  return hashString(`${getTryOnMode()}|${personUrl}|${ids.join(",")}`);
}

function resultRef(uid, key) {
  return ref(storage, `tryon/${uid}/results/${key}.png`);
}

export async function getCachedTryOn(uid, personUrl, items) {
  try {
    return await getDownloadURL(resultRef(uid, tryOnCacheKey(personUrl, items)));
  } catch {
    return null;
  }
}

async function cacheResult(uid, personUrl, items, blob) {
  const fileRef = resultRef(uid, tryOnCacheKey(personUrl, items));
  await uploadBytes(fileRef, blob, { contentType: "image/png" });
  return getDownloadURL(fileRef);
}

// --- cloud path: ModelsLab via the tryOnOutfit Cloud Function ---------------
function cloudClothType(item) {
  const role = TYPE_ROLE[item.type];
  if (role === "onepiece") return "dresses";
  if (role === "bottom") return "lower_body";
  return "upper_body";
}

async function generateCloud(personUrl, items, onProgress) {
  const products = tryOnItems(items).map((item) => ({
    url: item.imageUrl,
    clothType: cloudClothType(item),
  }));
  onProgress?.("Generating your try-on…");
  let response;
  try {
    response = await callTryOn({ personUrl, products });
  } catch (error) {
    throw new Error(error?.message || "Try-on failed. Please try again.");
  }
  const { imageBase64, mediaType } = response.data || {};
  if (!imageBase64) throw new Error("The try-on returned no image.");
  return (await fetch(`data:${mediaType || "image/png"};base64,${imageBase64}`)).blob();
}

// --- local path: a self-hosted Gradio try-on server (CatVTON) ---------------
// CatVTON's person input is an ImageEditor; a transparent layer means "no mask,
// auto-mask from cloth_type". Outputs are localhost URLs, so we fetch them to
// blobs before chaining (Gradio's SSRF guard rejects localhost URLs as inputs).
function localClothType(item) {
  const role = TYPE_ROLE[item.type];
  if (role === "onepiece") return "overall";
  if (role === "bottom") return "lower";
  return "upper";
}

let blankLayerPromise = null;
function blankLayer() {
  if (!blankLayerPromise) {
    blankLayerPromise = new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      canvas.toBlob(resolve, "image/png");
    });
  }
  return blankLayerPromise;
}

async function personEditorValue(source) {
  const layer = await blankLayer();
  const file = handle_file(source);
  return { background: file, layers: [handle_file(layer)], composite: file };
}

async function generateLocal(personUrl, items, onProgress) {
  const steps = tryOnItems(items).map((item) => ({ item, clothType: localClothType(item) }));

  let app;
  try {
    app = await Client.connect(getTryOnServerUrl());
  } catch {
    throw new Error("Can't reach your try-on server. Start it (see tryon-server/README.md) and retry.");
  }

  let personImage = await personEditorValue(personUrl);
  let lastBlob = null;
  for (let i = 0; i < steps.length; i++) {
    const { item, clothType } = steps[i];
    onProgress?.(`Applying ${clothType}…`);
    const result = await app.predict("/submit_function", {
      person_image: personImage,
      cloth_image: handle_file(item.imageUrl),
      cloth_type: clothType,
      num_inference_steps: 50,
      guidance_scale: 2.5,
      seed: 42,
      show_type: "result only",
    });
    const out = Array.isArray(result?.data) ? result.data[0] : null;
    const outUrl = typeof out === "string" ? out : out?.url;
    if (!outUrl) throw new Error("The try-on server returned no image.");
    lastBlob = await (await fetch(outUrl)).blob();
    if (i < steps.length - 1) personImage = await personEditorValue(lastBlob);
  }
  if (!lastBlob) throw new Error("Try-on did not produce an image.");
  return lastBlob;
}

/**
 * Generate a photoreal try-on of `items` on the person photo at `personUrl`,
 * via the configured provider. Pastes shoes/hat on afterward, caches, returns URL.
 */
export async function generateTryOn(personUrl, items, { uid, onProgress } = {}) {
  if (tryOnItems(items).length === 0) {
    throw new Error("Add a top, bottom, or dress to try on.");
  }

  const resultBlob =
    getTryOnMode() === "cloud"
      ? await generateCloud(personUrl, items, onProgress)
      : await generateLocal(personUrl, items, onProgress);

  onProgress?.("Finishing…");
  const finalBlob = await overlayAccessories(resultBlob, items);
  return uid ? cacheResult(uid, personUrl, items, finalBlob) : URL.createObjectURL(finalBlob);
}

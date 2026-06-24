import { Client, handle_file } from "@gradio/client";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";
import { itemForRole } from "./outfitEngine";
import { getTryOnServerUrl } from "./tryOnServer";

// Talks to a CatVTON Gradio server (see tryon-server/README.md). No keys, no
// cost — it runs on the user's own GPU. Locally that's http://localhost:7860;
// for the deployed site, point it at a public HTTPS tunnel (ngrok) via the
// in-app setting. The URL is resolved at call time from getTryOnServerUrl().

// CatVTON handles one garment category per run, so a full outfit is chained:
// person -> apply top -> feed result -> apply bottom. A dress is a single run.
// Shoes/accessories have no try-on category and are skipped.
export function tryOnSteps(items) {
  const dress = itemForRole(items, ["onepiece"]);
  if (dress) return [{ garment: dress, clothType: "overall" }];

  const steps = [];
  const top = itemForRole(items, ["outer", "mid", "base"]);
  const bottom = itemForRole(items, ["bottom"]);
  if (top) steps.push({ garment: top, clothType: "upper" });
  if (bottom) steps.push({ garment: bottom, clothType: "lower" });
  return steps;
}

// Stable-ish cache key: the person photo (its URL token changes on re-upload)
// plus the garments actually rendered. Shoes/accessories don't affect the image.
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export function tryOnCacheKey(personUrl, items) {
  const garmentIds = tryOnSteps(items).map((step) => step.garment.id);
  return hashString(`${personUrl}|${garmentIds.join(",")}`);
}

function resultRef(uid, key) {
  return ref(storage, `tryon/${uid}/results/${key}.png`);
}

// Returns a cached result URL for this person+outfit, or null.
export async function getCachedTryOn(uid, personUrl, items) {
  try {
    return await getDownloadURL(resultRef(uid, tryOnCacheKey(personUrl, items)));
  } catch {
    return null; // not generated yet
  }
}

async function cacheResult(uid, personUrl, items, blob) {
  const fileRef = resultRef(uid, tryOnCacheKey(personUrl, items));
  await uploadBytes(fileRef, blob, { contentType: "image/png" });
  return getDownloadURL(fileRef);
}

// CatVTON's person input is a Gradio ImageEditor; app.py reads layers[0] as an
// optional hand-drawn mask and treats a single-color layer as "no mask -> auto
// mask from cloth_type". We always send a transparent layer so it auto-masks.
let blankLayerPromise = null;
function blankLayer() {
  if (!blankLayerPromise) {
    blankLayerPromise = new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64; // left fully transparent
      canvas.toBlob(resolve, "image/png");
    });
  }
  return blankLayerPromise;
}

// `source` may be a URL string or a Blob. handle_file uploads blobs to the
// server; for chained steps we pass a blob (not the server's localhost URL),
// because gradio's SSRF guard rejects localhost URLs as inputs.
async function personEditorValue(source) {
  const layer = await blankLayer();
  const file = handle_file(source);
  return { background: file, layers: [handle_file(layer)], composite: file };
}

/**
 * Generate a photoreal try-on of `items` on the person photo at `personUrl`.
 * Chains a CatVTON run per garment category. Returns a Storage URL of the final
 * image (also cached). Throws a friendly error if the server is unreachable.
 *
 * @param {object} opts
 * @param {string} opts.uid          - for caching the result in Storage
 * @param {(label:string,i:number,total:number)=>void} [opts.onProgress]
 */
export async function generateTryOn(personUrl, items, { uid, onProgress } = {}) {
  const steps = tryOnSteps(items);
  if (steps.length === 0) {
    throw new Error("Add a top, bottom, or dress to try on.");
  }

  let app;
  try {
    app = await Client.connect(getTryOnServerUrl());
  } catch {
    throw new Error("Can't reach your try-on server. Start it (see tryon-server/README.md) and retry.");
  }

  // Each run takes the running person image + one garment and returns a new image.
  let personImage = await personEditorValue(personUrl);

  for (let i = 0; i < steps.length; i++) {
    const { garment, clothType } = steps[i];
    onProgress?.(`Applying ${clothType}…`, i, steps.length);

    // Endpoint + params verified against the running server via gradio view_api.
    const result = await app.predict("/submit_function", {
      person_image: personImage,
      cloth_image: handle_file(garment.imageUrl),
      cloth_type: clothType,
      num_inference_steps: 50,
      guidance_scale: 2.5,
      seed: 42,
      show_type: "result only",
    });

    const out = Array.isArray(result?.data) ? result.data[0] : null;
    const outUrl = typeof out === "string" ? out : out?.url;
    if (!outUrl) {
      throw new Error("The try-on server returned no image. Check its console and the API shape.");
    }
    // Pull the result off the server as a blob (works around the SSRF guard,
    // which blocks passing the localhost result URL back in as an input).
    const outBlob = await (await fetch(outUrl)).blob();
    if (i === steps.length - 1) {
      onProgress?.("Saving…", steps.length, steps.length);
      return uid ? cacheResult(uid, personUrl, items, outBlob) : URL.createObjectURL(outBlob);
    }
    // Feed this step's output in as the person for the next garment.
    personImage = await personEditorValue(outBlob);
  }

  throw new Error("Try-on did not produce an image.");
}

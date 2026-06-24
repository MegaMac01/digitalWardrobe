import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";

// The Claude API key. Set it once with:
//   firebase functions:secrets:set ANTHROPIC_API_KEY
// It is never exposed to the client — the key lives only in the function runtime.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// ModelsLab virtual try-on API key. Set it once with:
//   firebase functions:secrets:set MODELSLAB_API_KEY
const MODELSLAB_API_KEY = defineSecret("MODELSLAB_API_KEY");

// This is a frequent, latency-sensitive consumer call. Sonnet 4.6 is a good
// balance of quality and cost; swap to "claude-haiku-4-5" to go cheaper or
// "claude-opus-4-8" for the most capable model.
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an expert personal stylist building a single, well-composed outfit from a user's own wardrobe.

Each wardrobe item is JSON with: id, type, color, vibes, seasonTags, warmth (1-5), formality (1=very casual to 5=formal), isRainFriendly, favorite, notes. You also get context: current weather, the occasion/destination, time of day, the desired vibe, and free-text notes.

Types and how they layer:
- Base layer: Shirt. Mid layer: Sweater (sweaters/hoodies/knitwear). Outer: Jacket.
- Bottom: Pants, Shorts, or Skirt. One-piece: Dress (covers base + bottom on its own).
- Footwear: Shoes. Accessories: Hat, Bag, Accessory, Other.

Build the outfit on these principles:
1. STRUCTURE — Footwear, plus EITHER a base top and a bottom OR a single Dress (never pair a Dress with a separate bottom). Add a Sweater and/or Jacket as layers when it's cold, wet, or windy; keep it to a light single layer when hot.
2. FORMALITY — Keep every piece within about one level of each other, matched to the occasion/time of day (gym/beach ~1-2, everyday ~2-3, work ~3-4, dinner/event ~4-5). Don't mix a formal piece with very casual ones.
3. COLOR — Use a tight palette (about 2-3 colors). Anchor with neutrals (black, white, grey, navy, beige, denim, brown), allow at most one bold accent, and prefer harmonious or complementary pairings. Avoid clashing colors and fighting loud patterns.
4. WEATHER & VIBE — Warmth should suit the temperature; prefer rain-friendly pieces when wet. Honor the requested vibe and the user's notes, and lightly prefer items marked favorite.

Accessories: add 0-3 only when they genuinely complete the look and fit the palette. You may include more than one of the same kind (e.g. a belt and a necklace) when they work together.

If "lockedItemIds" is non-empty, those items are already chosen by the user: you MUST include every locked id in your result and build the rest of the outfit around them, complementing their color and formality. Do not replace or omit a locked item.

Choose ONLY from the provided items, by their exact "id". Never invent items or ids. If a slot can't be filled sensibly, omit it.

Respond ONLY with the structured object: a short catchy outfit name, the chosen item ids, and 3-5 short reasons that explain WHY this is a good outfit. Name the colour pairing and why it works together, how the dressiness suits the occasion and time of day, how it handles the weather, and any nice styling touch. Write them as clear, friendly sentences, not single words.`;

const OUTFIT_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "A short, catchy name for the outfit (max 60 chars).",
    },
    itemIds: {
      type: "array",
      description: "The ids of the chosen wardrobe items, one per slot used.",
      items: { type: "string" },
    },
    whyItWorks: {
      type: "array",
      description:
        "3-5 short, friendly sentences explaining WHY this is a good outfit: the colour pairing and why it works, how the dressiness fits the occasion and time of day, how it handles the weather, and any nice styling touch.",
      items: { type: "string" },
    },
  },
  required: ["name", "itemIds", "whyItWorks"],
  additionalProperties: false,
};

export const suggestOutfit = onCall(
  { secrets: [ANTHROPIC_API_KEY], cors: true, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to get suggestions.");
    }

    const { wardrobe, weather, occasion, timeOfDay, notes, vibe, lockedItemIds } = request.data || {};
    if (!Array.isArray(wardrobe) || wardrobe.length === 0) {
      throw new HttpsError("invalid-argument", "Add some clothes before generating an outfit.");
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    // Stable system prompt is cached (cache_control); the volatile context goes
    // in the user turn so it never invalidates the cached prefix.
    const userContent = JSON.stringify(
      {
        weather: weather ?? null,
        occasion: occasion || "everyday",
        timeOfDay: timeOfDay || "any",
        vibe: vibe || "Any",
        notes: notes || "",
        // Items the user already chose: keep them and build the rest around them.
        lockedItemIds: Array.isArray(lockedItemIds) ? lockedItemIds : [],
        wardrobe: wardrobe.slice(0, 200),
      },
      null,
      2
    );

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        thinking: { type: "adaptive" },
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        output_config: {
          format: { type: "json_schema", schema: OUTFIT_SCHEMA },
          effort: "low",
        },
        messages: [{ role: "user", content: userContent }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock) {
        throw new HttpsError("internal", "The stylist returned no suggestion.");
      }

      const parsed = JSON.parse(textBlock.text);
      return { ...parsed, model: MODEL };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error instanceof Anthropic.RateLimitError) {
        throw new HttpsError("resource-exhausted", "The stylist is busy. Try again shortly.");
      }
      if (error instanceof Anthropic.AuthenticationError) {
        throw new HttpsError("failed-precondition", "AI stylist is not configured.");
      }
      console.error("suggestOutfit failed", error);
      throw new HttpsError("internal", "Could not generate an AI suggestion.");
    }
  }
);

// --- Auto-tagging: look at a clothing photo and return wardrobe tags ---

// Keep this in sync with TYPE_ORDER in src/utils/outfitEngine.js. The two live
// across a package boundary (this function bundles independently of the web app),
// so they can't share a module — update both together. "Sweater" must be present
// or the auto-tagger can never return it, despite the prompt asking for it.
const GARMENT_TYPES = [
  "Shirt",
  "Sweater",
  "Dress",
  "Pants",
  "Shorts",
  "Skirt",
  "Jacket",
  "Shoes",
  "Hat",
  "Bag",
  "Accessory",
  "Other",
];
const GARMENT_SEASONS = ["Any", "Spring", "Summer", "Autumn", "Winter"];
const GARMENT_VIBES = [
  "Classic",
  "Street",
  "Minimal",
  "Cozy",
  "Romantic",
  "Formal",
  "Sporty",
  "Bold",
];

const GARMENT_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: GARMENT_TYPES },
    color: { type: "string", description: "A simple common color name, e.g. navy, tan, olive." },
    brand: {
      type: "string",
      description:
        "The brand name only if a logo or label is clearly legible in the photo; otherwise an empty string. Never guess.",
    },
    seasonTags: { type: "array", items: { type: "string", enum: GARMENT_SEASONS } },
    vibes: { type: "array", items: { type: "string", enum: GARMENT_VIBES } },
    warmth: { type: "integer", enum: [1, 2, 3, 4, 5] },
    formality: { type: "integer", enum: [1, 2, 3, 4, 5] },
    isRainFriendly: { type: "boolean" },
  },
  required: ["type", "color", "brand", "seasonTags", "vibes", "warmth", "formality", "isRainFriendly"],
  additionalProperties: false,
};

export const analyzeGarment = onCall(
  { secrets: [ANTHROPIC_API_KEY], cors: true, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to analyze photos.");
    }

    const { imageBase64, mediaType } = request.data || {};
    if (!imageBase64) {
      throw new HttpsError("invalid-argument", "No image provided.");
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 512,
        output_config: {
          format: { type: "json_schema", schema: GARMENT_SCHEMA },
          effort: "low",
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
              },
              {
                type: "text",
                text: "Identify this single clothing item for a wardrobe app. Choose the closest type (Sweater covers sweaters/hoodies/knitwear), a simple common color name, the brand only if a logo or label is clearly legible (otherwise leave brand empty — never guess), the seasons it suits, 1-3 style vibes from the allowed list, a warmth level from 1 (breezy) to 5 (heavy/insulated), a formality/dressiness from 1 (very casual) to 5 (formal), and whether it is rain-friendly.",
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock) {
        throw new HttpsError("internal", "No analysis returned.");
      }
      return JSON.parse(textBlock.text);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error instanceof Anthropic.RateLimitError) {
        throw new HttpsError("resource-exhausted", "Busy right now. Try again shortly.");
      }
      if (error instanceof Anthropic.AuthenticationError) {
        throw new HttpsError("failed-precondition", "AI is not configured.");
      }
      console.error("analyzeGarment failed", error);
      throw new HttpsError("internal", "Could not analyze the image.");
    }
  }
);

// --- Photoreal try-on via ModelsLab (tops/bottoms/dresses; no footwear) ---

const MODELSLAB_FASHION = "https://modelslab.com/api/v6/image_editing/fashion";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Apply one garment to the running model image; returns the result image URL.
// ModelsLab is async: a "processing" response gives a fetch_result URL to poll.
async function modelsLabApply(apiKey, modelImage, garmentImage, clothType) {
  const post = (url, body) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((res) => res.json().catch(() => ({})));

  let data = await post(MODELSLAB_FASHION, {
    key: apiKey,
    init_image: modelImage,
    cloth_image: garmentImage,
    cloth_type: clothType,
    num_inference_steps: 31,
  });

  const deadline = Date.now() + 150000; // up to 2.5 min per item
  while (data.status === "processing" && data.fetch_result && Date.now() < deadline) {
    await sleep(Math.min(Math.max((data.eta || 3) * 1000, 2000), 8000));
    data = await post(data.fetch_result, { key: apiKey });
  }

  if (data.status === "success") {
    const out = Array.isArray(data.output) ? data.output[0] : null;
    if (!out) throw new HttpsError("internal", "Try-on returned no image.");
    return out;
  }
  if (data.status === "error") {
    console.error("ModelsLab error", data.message);
    throw new HttpsError("failed-precondition", "Try-on isn't configured (check the API key/credits).");
  }
  throw new HttpsError("deadline-exceeded", "The try-on timed out. Try again.");
}

export const tryOnOutfit = onCall(
  { secrets: [MODELSLAB_API_KEY], cors: true, timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to try on outfits.");
    }
    const { personUrl, products } = request.data || {};
    if (!personUrl || !Array.isArray(products) || products.length === 0) {
      throw new HttpsError("invalid-argument", "Need a photo and at least one item.");
    }

    const apiKey = MODELSLAB_API_KEY.value();
    // Chain garments: each result becomes the model for the next. Each item is
    // { url, clothType } where clothType is upper_body | lower_body | dresses.
    let modelImage = personUrl;
    for (const product of products.slice(0, 4)) {
      modelImage = await modelsLabApply(apiKey, modelImage, product.url, product.clothType);
    }

    // Return the final image as base64 so the client can cache it in Storage
    // (FASHN's hosted URLs expire after ~72h).
    try {
      const finalRes = await fetch(modelImage);
      const buffer = Buffer.from(await finalRes.arrayBuffer());
      return {
        imageBase64: buffer.toString("base64"),
        mediaType: finalRes.headers.get("content-type") || "image/png",
      };
    } catch (error) {
      console.error("fetch final try-on image failed", error);
      throw new HttpsError("internal", "Could not retrieve the try-on image.");
    }
  }
);

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";

// The Claude API key. Set it once with:
//   firebase functions:secrets:set ANTHROPIC_API_KEY
// It is never exposed to the client — the key lives only in the function runtime.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// This is a frequent, latency-sensitive consumer call. Sonnet 4.6 is a good
// balance of quality and cost; swap to "claude-haiku-4-5" to go cheaper or
// "claude-opus-4-8" for the most capable model.
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an expert personal stylist building a single outfit from a user's own wardrobe.

You will receive the wardrobe as a JSON array of items (each with id, type, color, vibes, seasonTags, warmth 1-5, isRainFriendly, favorite, notes) plus context: current weather, the occasion/destination, time of day, the desired vibe, and free-text notes.

Rules:
- Choose ONLY from the provided wardrobe items. Reference items by their exact "id".
- Build a complete, wearable outfit: at minimum a top (Shirt), bottom (Pants), and Shoes. Add a Jacket when the weather is cold, wet, or windy, and at most one "Other" accessory when it elevates the look.
- Match the occasion and time of day for formality (e.g. a work meeting or dinner is dressier than a gym session or beach day).
- Respect the weather: warmth level should suit the temperature; prefer rain-friendly pieces when it is wet; layer for cold or wind.
- Honor the requested vibe and any explicit notes from the user.
- Favor cohesive color pairings and lightly prefer items marked favorite.
- Never invent items or ids that are not in the wardrobe. If a slot cannot be reasonably filled from the wardrobe, omit it.

Respond ONLY with the structured object: a short catchy outfit name, the chosen item ids, and 2-4 concise bullet reasons explaining why the outfit works for this weather and occasion.`;

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
      description: "2-4 concise reasons the outfit suits the weather and occasion.",
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

    const { wardrobe, weather, occasion, timeOfDay, notes, vibe } = request.data || {};
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

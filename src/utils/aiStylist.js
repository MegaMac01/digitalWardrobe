import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { buildSuggestedOutfit, buildOutfitName, missingEssentials, TYPE_ORDER } from "./outfitEngine";
import { logClientError } from "./telemetry";

const callSuggestOutfit = httpsCallable(functions, "suggestOutfit");
const callAnalyzeGarment = httpsCallable(functions, "analyzeGarment");

/**
 * Ask the AI to tag a clothing photo. Returns the tag object
 * ({ type, color, seasonTags, vibes, warmth, isRainFriendly }) or null if the
 * function isn't deployed / errors — callers fall back to manual defaults.
 */
export async function analyzeGarment(imageBase64, mediaType) {
  try {
    const response = await callAnalyzeGarment({ imageBase64, mediaType });
    return response.data || null;
  } catch (error) {
    logClientError(error, { scope: "ai-stylist", action: "analyze-garment" });
    return null;
  }
}

// Trim each wardrobe item to just the fields the stylist needs (no image URLs etc.).
function toWardrobePayload(clothes) {
  return clothes.map((item) => ({
    id: item.id,
    type: item.type,
    color: item.color ?? "",
    vibes: item.vibes ?? [],
    seasonTags: item.seasonTags ?? ["Any"],
    warmth: item.warmth ?? 3,
    formality: item.formality ?? 3,
    isRainFriendly: Boolean(item.isRainFriendly),
    favorite: Boolean(item.favorite),
    notes: item.notes ?? "",
  }));
}

// Shape the AI's chosen item ids into the same structure the rule engine returns,
// so OutfitCard and the save flow can consume either source unchanged.
function shapeFromItemIds(itemIds, clothes, { vibe, weather, name, whyItWorks }) {
  const clothesById = new Map(clothes.map((item) => [item.id, item]));
  const selected = {};

  itemIds.forEach((id) => {
    const item = clothesById.get(id);
    if (item && !selected[item.type]) {
      selected[item.type] = item;
    }
  });

  const itemIdsByType = TYPE_ORDER.reduce((acc, type) => {
    acc[type] = selected[type]?.id ?? null;
    return acc;
  }, {});

  const itemsByType = TYPE_ORDER.reduce((acc, type) => {
    acc[type] = selected[type] ?? null;
    return acc;
  }, {});

  const previewOrder = TYPE_ORDER.filter((type) => itemIdsByType[type]);
  const missingRequired = missingEssentials(itemsByType);

  return {
    itemIdsByType,
    itemsByType,
    missingRequired,
    previewOrder,
    vibe,
    name: name || buildOutfitName(vibe, weather),
    whyItWorks: Array.isArray(whyItWorks) ? whyItWorks.slice(0, 6) : [],
    generatedAt: Date.now(),
  };
}

/**
 * Generate an outfit suggestion. Tries the AI stylist Cloud Function first;
 * if it is not deployed/configured or errors, falls back to the local rule engine.
 * Returns { suggestion, source: "ai" | "rules" }.
 */
export async function suggestOutfit(clothes, { vibe = "Any", weather = null, occasion = "", timeOfDay = "", notes = "" } = {}) {
  try {
    const response = await callSuggestOutfit({
      wardrobe: toWardrobePayload(clothes),
      weather,
      occasion,
      timeOfDay,
      notes,
      vibe,
    });

    const data = response.data || {};
    if (!Array.isArray(data.itemIds) || data.itemIds.length === 0) {
      throw new Error("AI returned no items");
    }

    return {
      source: "ai",
      suggestion: shapeFromItemIds(data.itemIds, clothes, {
        vibe,
        weather,
        name: data.name,
        whyItWorks: data.whyItWorks,
      }),
    };
  } catch (error) {
    logClientError(error, { scope: "ai-stylist", action: "suggest-outfit-fallback" });
    return {
      source: "rules",
      suggestion: buildSuggestedOutfit(clothes, { vibe, weather }),
    };
  }
}

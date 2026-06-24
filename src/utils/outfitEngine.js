export const TYPE_ORDER = [
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

// The layer/role each type plays when assembling an outfit. Layers stack
// base -> mid -> outer; a "onepiece" (dress) covers base + bottom on its own.
export const TYPE_ROLE = {
  Shirt: "base",
  Sweater: "mid",
  Dress: "onepiece",
  Pants: "bottom",
  Shorts: "bottom",
  Skirt: "bottom",
  Jacket: "outer",
  Shoes: "footwear",
  Hat: "accessory",
  Bag: "accessory",
  Accessory: "accessory",
  Other: "accessory",
};

// Dressiness scale used for formality coherence (1 = very casual, 5 = formal).
export const FORMALITY_OPTIONS = [
  { value: 1, label: "1 - Very casual" },
  { value: 2, label: "2 - Casual" },
  { value: 3, label: "3 - Smart casual" },
  { value: 4, label: "4 - Dressy" },
  { value: 5, label: "5 - Formal" },
];

// A wearable outfit needs footwear, plus either a base top and a bottom, or a
// one-piece dress. Takes a flat array of items. Returns human-readable phrases
// for what's missing.
export function missingEssentials(items) {
  const list = Array.isArray(items) ? items.filter(Boolean) : Object.values(items ?? {}).filter(Boolean);
  const has = (role) => list.some((item) => TYPE_ROLE[item.type] === role);
  const missing = [];
  const hasBase = has("base");
  const hasBottom = has("bottom");
  if (!has("onepiece") && !(hasBase && hasBottom)) {
    if (!hasBase && !hasBottom) missing.push("a top and bottom (or a dress)");
    else if (!hasBase) missing.push("a top");
    else missing.push("a bottom");
  }
  if (!has("footwear")) missing.push("shoes");
  return missing;
}

// Render/layer order for a set of items: outer -> mid -> top/dress -> bottom ->
// shoes -> accessories, with TYPE_ORDER as the tiebreak within a rank.
const RENDER_ROLE_RANK = { outer: 0, mid: 1, onepiece: 2, base: 2, bottom: 3, footwear: 4, accessory: 5 };

export function orderItems(items) {
  return [...items].filter(Boolean).sort((a, b) => {
    const ra = RENDER_ROLE_RANK[TYPE_ROLE[a.type]] ?? 9;
    const rb = RENDER_ROLE_RANK[TYPE_ROLE[b.type]] ?? 9;
    if (ra !== rb) return ra - rb;
    return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
  });
}

// The first item playing one of the given layer roles (structural slots are single).
export function itemForRole(items, roles) {
  return orderItems(items).find((item) => roles.includes(TYPE_ROLE[item.type])) ?? null;
}

export function accessoriesOf(items) {
  return items.filter((item) => item && TYPE_ROLE[item.type] === "accessory");
}

// Canonical ordered item ids for an outfit. Prefers the new `itemIds` array;
// falls back to the legacy type-keyed map for outfits saved before that change.
export function outfitItemIds(outfit) {
  if (Array.isArray(outfit?.itemIds)) return outfit.itemIds.filter(Boolean);
  const map = outfit?.itemIdsByType ?? {};
  const order = outfit?.previewOrder?.length ? outfit.previewOrder : TYPE_ORDER;
  return order.map((type) => map[type]).filter(Boolean);
}

export const VIBE_OPTIONS = [
  "Classic",
  "Street",
  "Minimal",
  "Cozy",
  "Romantic",
  "Formal",
  "Sporty",
  "Bold",
];

export const SEASON_OPTIONS = ["Any", "Spring", "Summer", "Autumn", "Winter"];

// One-tap occasion presets for the Today home screen.
export const OCCASION_PRESETS = [
  "Work",
  "Casual",
  "Gym",
  "Dinner",
  "Beach",
  "Errands",
  "Night out",
];

const COLOR_FAMILIES = {
  neutral: ["black", "white", "gray", "grey", "beige", "cream", "ivory", "tan", "khaki", "brown"],
  blue: ["blue", "navy", "teal", "azure", "cobalt"],
  red: ["red", "maroon", "burgundy", "crimson", "wine"],
  green: ["green", "olive", "mint", "forest", "sage"],
  yellow: ["yellow", "mustard", "gold", "amber"],
  purple: ["purple", "lavender", "violet", "plum"],
  orange: ["orange", "rust", "terracotta", "coral", "peach"],
  pink: ["pink", "rose", "fuchsia", "magenta"],
};

const COMPLEMENTARY = {
  blue: ["orange"],
  red: ["green"],
  green: ["red", "pink"],
  yellow: ["purple", "blue"],
  purple: ["yellow"],
  orange: ["blue"],
  pink: ["green"],
};

function getColorFamily(colorValue) {
  const color = String(colorValue ?? "").toLowerCase();
  if (!color) return "unknown";

  for (const [family, keywords] of Object.entries(COLOR_FAMILIES)) {
    if (keywords.some((keyword) => color.includes(keyword))) {
      return family;
    }
  }

  return "unknown";
}

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month <= 1 || month === 11) return "Winter";
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  return "Autumn";
}

function scoreForWeather(item, weather) {
  if (!weather) {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons = [];
  const warmth = Number(item.warmth ?? 3);
  const isRainFriendly = Boolean(item.isRainFriendly);

  if (weather.isCold) {
    if (warmth >= 4) {
      score += 6;
      reasons.push("Warmth level fits colder weather.");
    }
    if (warmth === 3) {
      score += 2;
      reasons.push("Mid warmth works with cool weather.");
    }
    if (warmth <= 2) score -= 4;
  }

  if (weather.isHot) {
    if (warmth <= 2) {
      score += 6;
      reasons.push("Lightweight piece for hot weather.");
    }
    if (warmth >= 4) score -= 5;
  }

  if (!weather.isCold && !weather.isHot && warmth >= 2 && warmth <= 4) {
    score += 2;
    reasons.push("Balanced warmth for mild weather.");
  }

  if (weather.isRaining) {
    if (isRainFriendly) {
      score += 5;
      reasons.push("Rain-friendly pick for wet weather.");
    }
    if (!isRainFriendly && (item.type === "Shoes" || item.type === "Jacket")) score -= 6;
  }

  if (weather.isSnowing && warmth >= 4) {
    score += 4;
    reasons.push("Heavy insulation helps in snowy weather.");
  }

  if (weather.isWindy && item.type === "Jacket" && warmth >= 3) {
    score += 5;
    reasons.push("Protective layer for windy conditions.");
  }

  if (weather.isWindy && item.type !== "Jacket" && warmth <= 1) {
    score -= 2;
  }

  return { score, reasons };
}

// Uses pre-computed color family maps to avoid redundant string scanning per call.
function scoreForColorHarmony(itemFamily, selectedItems, colorFamilyCache) {
  if (itemFamily === "unknown") {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons = [];
  const existingFamilies = Object.values(selectedItems)
    .map((selected) => (selected ? colorFamilyCache.get(selected.id) ?? "unknown" : "unknown"))
    .filter((family) => family !== "unknown");

  if (existingFamilies.length === 0) {
    return { score: 0, reasons };
  }

  existingFamilies.forEach((family) => {
    if (family === itemFamily) {
      score += 1;
      reasons.push("Color palette stays cohesive.");
      return;
    }

    if (family === "neutral" || itemFamily === "neutral") {
      score += 2;
      reasons.push("Neutral pairing keeps the look versatile.");
      return;
    }

    if (COMPLEMENTARY[itemFamily]?.includes(family) || COMPLEMENTARY[family]?.includes(itemFamily)) {
      score += 3;
      reasons.push("Complementary colors add contrast.");
      return;
    }

    score -= 1;
  });

  return { score, reasons };
}

// Map an occasion/destination to a target dressiness (1 casual - 5 formal), so
// the rule engine honors the occasion even when the AI stylist is unavailable.
// Returns null for occasions we can't confidently classify (no bias applied).
export function formalityTargetFor(occasion) {
  const o = String(occasion ?? "").toLowerCase();
  if (!o) return null;
  if (/gym|workout|run|jog|yoga|hike|beach|pool|swim/.test(o)) return 1.5;
  if (/dinner|date|night out|nightout|event|wedding|formal|cocktail|gala|party|theat|opera/.test(o)) return 4.5;
  if (/work|office|interview|business|meeting|conference|presentation/.test(o)) return 3.5;
  if (/casual|errand|everyday|home|park|coffee|grocery|walk|brunch/.test(o)) return 2.5;
  return null;
}

// season and colorFamilyCache are pre-computed once per buildSuggestedOutfit call.
function scoreItem(item, { vibe, weather, selectedItems, season, colorFamilyCache, formalityTarget }) {
  let score = 10;
  const reasons = [];
  const itemVibes = item.vibes ?? [];
  const seasonTags = item.seasonTags ?? ["Any"];

  if (item.favorite) {
    score += 3;
    reasons.push("Favorite item gets priority.");
  }

  if (vibe && vibe !== "Any") {
    if (itemVibes.includes(vibe)) {
      score += 7;
      reasons.push(`Tagged for ${vibe.toLowerCase()} vibe.`);
    } else {
      score -= 2;
    }
  }

  if (seasonTags.includes("Any") || seasonTags.includes(season)) {
    score += 3;
    reasons.push(`Season tag matches ${season.toLowerCase()}.`);
  } else {
    score -= 3;
  }

  const weatherResult = scoreForWeather(item, weather);
  score += weatherResult.score;
  reasons.push(...weatherResult.reasons);

  const itemFamily = colorFamilyCache.get(item.id) ?? "unknown";
  const colorResult = scoreForColorHarmony(itemFamily, selectedItems, colorFamilyCache);
  score += colorResult.score;
  reasons.push(...colorResult.reasons);

  // Light formality cohesion: keep the look at one dressiness level.
  const chosenFormalities = Object.values(selectedItems)
    .filter(Boolean)
    .map((sel) => Number(sel.formality ?? 3));
  if (chosenFormalities.length > 0) {
    const avg = chosenFormalities.reduce((sum, value) => sum + value, 0) / chosenFormalities.length;
    const diff = Math.abs(Number(item.formality ?? 3) - avg);
    if (diff <= 1) {
      score += 2;
      reasons.push("Dressiness fits the rest of the look.");
    } else if (diff >= 2.5) {
      score -= 4;
    }
  }

  // Occasion-driven dressiness: pull picks toward the target the occasion implies.
  if (formalityTarget != null) {
    const targetDiff = Math.abs(Number(item.formality ?? 3) - formalityTarget);
    if (targetDiff <= 0.5) {
      score += 5;
      reasons.push("Dressiness suits the occasion.");
    } else if (targetDiff <= 1.5) {
      score += 2;
    } else if (targetDiff >= 2.5) {
      score -= 5;
    }
  }

  const uniqueReasons = [...new Set(reasons)];
  return { score, reasons: uniqueReasons.slice(0, 3) };
}

function pickBestItem(items, context, usedIds, selectedItems) {
  const candidates = items.filter((item) => !usedIds.has(item.id));
  if (candidates.length === 0) {
    return null;
  }

  const scored = candidates
    .map((item) => ({ item, ...scoreItem(item, { ...context, selectedItems }) }))
    .sort((a, b) => b.score - a.score);
  const topPool = scored.slice(0, Math.min(3, scored.length));
  const pick = topPool[Math.floor(Math.random() * topPool.length)];

  return pick ?? null;
}

function buildWhyItWorks(explanationGroups, vibe, weather) {
  const reasons = [];

  if (vibe && vibe !== "Any") {
    reasons.push(`Built around your ${vibe.toLowerCase()} vibe.`);
  }

  if (weather) {
    const weatherFlags = [];
    if (weather.isCold) weatherFlags.push("cold");
    if (weather.isHot) weatherFlags.push("heat");
    if (weather.isRaining) weatherFlags.push("rain");
    if (weather.isSnowing) weatherFlags.push("snow");
    if (weather.isWindy) weatherFlags.push("wind");
    if (weatherFlags.length > 0) {
      reasons.push(`Weather-aware picks tuned for ${weatherFlags.join(", ")}.`);
    }
  }

  explanationGroups.forEach((group) => {
    group.forEach((reason) => reasons.push(reason));
  });

  return [...new Set(reasons)].slice(0, 6);
}

export function buildSuggestedOutfit(
  clothes,
  { vibe = "Any", weather = null, occasion = "", locked = [] } = {}
) {
  // Pre-compute once so scoreItem and scoreForColorHarmony don't repeat this work per candidate.
  const season = getCurrentSeason();
  const colorFamilyCache = new Map(clothes.map((item) => [item.id, getColorFamily(item.color)]));
  const formalityTarget = formalityTargetFor(occasion);
  const context = { vibe, weather, season, colorFamilyCache, formalityTarget };

  const byRole = (role) => clothes.filter((item) => TYPE_ROLE[item.type] === role);

  const selected = {}; // structural slots: type -> item (one per type)
  const accessories = []; // accessory-role items (multiple, same type allowed)
  const usedIds = new Set();
  const explanationGroups = [];
  let matchScore = 0;

  // Everything chosen so far, for color/formality cohesion scoring.
  const chosen = () => [...Object.values(selected), ...accessories];

  // Pre-place any locked items, so we build the rest of the outfit around them.
  locked.forEach((item) => {
    if (!item?.id || usedIds.has(item.id)) return;
    usedIds.add(item.id);
    if (TYPE_ROLE[item.type] === "accessory") accessories.push(item);
    else selected[item.type] = item;
  });

  const roleFilled = (role) => chosen().some((item) => TYPE_ROLE[item.type] === role);

  function record(result) {
    usedIds.add(result.item.id);
    explanationGroups.push(result.reasons ?? []);
    matchScore += result.score ?? 0;
  }

  function take(items) {
    const result = pickBestItem(items, context, usedIds, chosen());
    if (!result?.item?.id) return null;
    selected[result.item.type] = result.item;
    record(result);
    return result.item;
  }

  function takeAccessory(items) {
    const result = pickBestItem(items, context, usedIds, chosen());
    if (!result?.item?.id) return null;
    accessories.push(result.item);
    record(result);
    return result.item;
  }

  const bases = byRole("base");
  const bottoms = byRole("bottom");
  const dresses = byRole("onepiece");
  const canSeparates = bases.length > 0 && bottoms.length > 0;

  // Core: a dress covers base+bottom. Only fill roles not already locked.
  if (!roleFilled("onepiece")) {
    if (!roleFilled("base") && !roleFilled("bottom")) {
      if (dresses.length > 0 && (!canSeparates || Math.random() < 0.4)) {
        take(dresses);
      } else {
        take(bases);
        take(bottoms);
      }
    } else {
      if (!roleFilled("base")) take(bases);
      if (!roleFilled("bottom")) take(bottoms);
    }
  }

  if (!roleFilled("footwear")) take(byRole("footwear"));

  // Mid layer (sweater/hoodie): always when cold, sometimes in mild weather.
  if (!roleFilled("mid")) {
    if (weather?.isCold) {
      take(byRole("mid"));
    } else if (!weather?.isHot && Math.random() < 0.3) {
      take(byRole("mid"));
    }
  }

  // Outer layer for cold/wet/windy conditions.
  if (!roleFilled("outer") && (weather?.isCold || weather?.isWindy || weather?.isRaining)) {
    take(byRole("outer"));
  }

  // Finish with up to three accessories (counting any locked); duplicates of a
  // kind are allowed (e.g. two Accessory items), with diminishing likelihood.
  const accessoryPool = () => byRole("accessory").filter((item) => !usedIds.has(item.id));
  [0.55, 0.3, 0.15].forEach((probability) => {
    if (accessories.length >= 3) return;
    const pool = accessoryPool();
    if (pool.length > 0 && Math.random() < probability) takeAccessory(pool);
  });

  const orderedItems = orderItems(chosen());

  return {
    items: orderedItems,
    itemIds: orderedItems.map((item) => item.id),
    missingRequired: missingEssentials(orderedItems),
    vibe,
    matchScore,
    whyItWorks: buildWhyItWorks(explanationGroups, vibe, weather),
    generatedAt: Date.now(),
  };
}

export function buildOutfitName(vibe, weather) {
  const temp = weather?.temperature ? `${Math.round(weather.temperature)}°C` : "Any Weather";
  const mood = vibe && vibe !== "Any" ? vibe : "Everyday";
  return `${mood} ${temp} Fit`;
}

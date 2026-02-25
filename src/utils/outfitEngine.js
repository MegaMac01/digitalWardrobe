export const TYPE_ORDER = ["Shirt", "Pants", "Jacket", "Shoes", "Other"];

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

function scoreForColorHarmony(item, selectedItems) {
  const thisFamily = getColorFamily(item.color);
  if (thisFamily === "unknown") {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons = [];
  const existingFamilies = Object.values(selectedItems)
    .map((selected) => getColorFamily(selected?.color))
    .filter((family) => family !== "unknown");

  if (existingFamilies.length === 0) {
    return { score: 0, reasons };
  }

  existingFamilies.forEach((family) => {
    if (family === thisFamily) {
      score += 1;
      reasons.push("Color palette stays cohesive.");
      return;
    }

    if (family === "neutral" || thisFamily === "neutral") {
      score += 2;
      reasons.push("Neutral pairing keeps the look versatile.");
      return;
    }

    if (COMPLEMENTARY[thisFamily]?.includes(family) || COMPLEMENTARY[family]?.includes(thisFamily)) {
      score += 3;
      reasons.push("Complementary colors add contrast.");
      return;
    }

    score -= 1;
  });

  return { score, reasons };
}

function scoreItem(item, { vibe, weather, selectedItems }) {
  let score = 10;
  const reasons = [];
  const itemVibes = item.vibes ?? [];
  const seasonTags = item.seasonTags ?? ["Any"];
  const season = getCurrentSeason();

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

  const colorResult = scoreForColorHarmony(item, selectedItems);
  score += colorResult.score;
  reasons.push(...colorResult.reasons);

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

function buildWhyItWorks(explanationsByType, vibe, weather) {
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

  Object.values(explanationsByType).forEach((typeReasons) => {
    typeReasons.forEach((reason) => reasons.push(reason));
  });

  return [...new Set(reasons)].slice(0, 6);
}

export function buildSuggestedOutfit(clothes, { vibe = "Any", weather = null } = {}) {
  const grouped = TYPE_ORDER.reduce((acc, type) => {
    acc[type] = clothes.filter((item) => item.type === type);
    return acc;
  }, {});

  const selected = {};
  const usedIds = new Set();
  const explanationsByType = {};
  const required = ["Shirt", "Pants", "Shoes"];
  const missingRequired = [];
  const context = { vibe, weather };
  let matchScore = 0;

  required.forEach((type) => {
    const pickedResult = pickBestItem(grouped[type], context, usedIds, selected);
    selected[type] = pickedResult?.item ?? null;
    explanationsByType[type] = pickedResult?.reasons ?? [];
    matchScore += pickedResult?.score ?? 0;

    if (pickedResult?.item?.id) {
      usedIds.add(pickedResult.item.id);
    } else {
      missingRequired.push(type);
    }
  });

  if (weather?.isCold || weather?.isWindy || weather?.isRaining) {
    const jacketResult = pickBestItem(grouped.Jacket, context, usedIds, selected);
    selected.Jacket = jacketResult?.item ?? null;
    explanationsByType.Jacket = jacketResult?.reasons ?? [];
    matchScore += jacketResult?.score ?? 0;

    if (jacketResult?.item?.id) {
      usedIds.add(jacketResult.item.id);
    }
  }

  const otherResult = pickBestItem(grouped.Other, context, usedIds, selected);
  if (otherResult?.item?.id && Math.random() > 0.35) {
    selected.Other = otherResult.item;
    explanationsByType.Other = otherResult.reasons ?? [];
    matchScore += otherResult.score ?? 0;
  }

  const itemIdsByType = TYPE_ORDER.reduce((acc, type) => {
    acc[type] = selected[type]?.id ?? null;
    return acc;
  }, {});

  const previewOrder = TYPE_ORDER.filter((type) => itemIdsByType[type]);

  const itemsByType = TYPE_ORDER.reduce((acc, type) => {
    acc[type] = selected[type] ?? null;
    return acc;
  }, {});

  return {
    itemIdsByType,
    itemsByType,
    missingRequired,
    previewOrder,
    vibe,
    matchScore,
    explanationsByType,
    whyItWorks: buildWhyItWorks(explanationsByType, vibe, weather),
    generatedAt: Date.now(),
  };
}

export function buildOutfitName(vibe, weather) {
  const temp = weather?.temperature ? `${Math.round(weather.temperature)}F` : "Any Weather";
  const mood = vibe && vibe !== "Any" ? vibe : "Everyday";
  return `${mood} ${temp} Fit`;
}

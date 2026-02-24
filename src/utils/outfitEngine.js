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

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month <= 1 || month === 11) return "Winter";
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  return "Autumn";
}

function scoreForWeather(item, weather) {
  if (!weather) {
    return 0;
  }

  let score = 0;
  const warmth = Number(item.warmth ?? 3);
  const isRainFriendly = Boolean(item.isRainFriendly);

  if (weather.isCold) {
    if (warmth >= 4) score += 5;
    if (warmth === 3) score += 2;
    if (warmth <= 2) score -= 3;
  }

  if (weather.isHot) {
    if (warmth <= 2) score += 4;
    if (warmth >= 4) score -= 4;
  }

  if (!weather.isCold && !weather.isHot && warmth >= 2 && warmth <= 4) {
    score += 2;
  }

  if (weather.isRaining) {
    if (isRainFriendly) score += 5;
    if (!isRainFriendly && (item.type === "Shoes" || item.type === "Jacket")) score -= 4;
  }

  if (weather.isWindy && item.type === "Jacket" && warmth >= 3) {
    score += 3;
  }

  return score;
}

function scoreItem(item, { vibe, weather }) {
  let score = 10;
  const itemVibes = item.vibes ?? [];
  const seasonTags = item.seasonTags ?? ["Any"];
  const season = getCurrentSeason();

  if (item.favorite) {
    score += 3;
  }

  if (vibe && vibe !== "Any") {
    score += itemVibes.includes(vibe) ? 6 : -1;
  }

  if (seasonTags.includes("Any") || seasonTags.includes(season)) {
    score += 2;
  } else {
    score -= 2;
  }

  score += scoreForWeather(item, weather);

  return score;
}

function pickBestItem(items, context, usedIds) {
  const candidates = items.filter((item) => !usedIds.has(item.id));
  if (candidates.length === 0) {
    return null;
  }

  const scored = candidates
    .map((item) => ({ item, score: scoreItem(item, context) }))
    .sort((a, b) => b.score - a.score);
  const topPool = scored.slice(0, Math.min(3, scored.length));
  const pick = topPool[Math.floor(Math.random() * topPool.length)];

  return pick?.item ?? null;
}

export function buildSuggestedOutfit(clothes, { vibe = "Any", weather = null } = {}) {
  const grouped = TYPE_ORDER.reduce((acc, type) => {
    acc[type] = clothes.filter((item) => item.type === type);
    return acc;
  }, {});

  const selected = {};
  const usedIds = new Set();
  const required = ["Shirt", "Pants", "Shoes"];
  const missingRequired = [];
  const context = { vibe, weather };

  required.forEach((type) => {
    const picked = pickBestItem(grouped[type], context, usedIds);
    selected[type] = picked;
    if (picked?.id) {
      usedIds.add(picked.id);
    } else {
      missingRequired.push(type);
    }
  });

  if (weather?.isCold || weather?.isWindy || weather?.isRaining) {
    const jacket = pickBestItem(grouped.Jacket, context, usedIds);
    if (jacket?.id) {
      selected.Jacket = jacket;
      usedIds.add(jacket.id);
    }
  }

  const other = pickBestItem(grouped.Other, context, usedIds);
  if (other?.id && Math.random() > 0.35) {
    selected.Other = other;
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
    generatedAt: Date.now(),
  };
}

export function buildOutfitName(vibe, weather) {
  const temp = weather?.temperature ? `${Math.round(weather.temperature)}F` : "Any Weather";
  const mood = vibe && vibe !== "Any" ? vibe : "Everyday";
  return `${mood} ${temp} Fit`;
}

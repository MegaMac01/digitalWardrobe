export function sortNewest(items) {
  return [...items].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Returns a map of ISO date string → array of outfit objects scheduled on that date.
export function buildScheduleMap(outfits) {
  const map = {};
  outfits.forEach((outfit) => {
    (outfit.scheduledDates || []).forEach((dateISO) => {
      if (!map[dateISO]) map[dateISO] = [];
      map[dateISO].push(outfit);
    });
  });
  return map;
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Time of day derived from the device clock, so we never have to ask the user.
export function getTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

export function formatTemp(temperature) {
  if (temperature === null || temperature === undefined) return "--";
  return `${Math.round(temperature)}°`;
}

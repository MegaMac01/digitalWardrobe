// Where the photoreal try-on (CatVTON) server lives. Resolved at runtime so it
// works on the deployed site without a rebuild: a value saved in the browser
// wins, then the build-time env var, then the local default.
const KEY = "tryonServerUrl";

const clean = (url) => String(url || "").trim().replace(/\/+$/, "");

export function getTryOnServerUrl() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return clean(saved);
  } catch {
    /* localStorage unavailable */
  }
  return clean(import.meta.env.VITE_TRYON_SERVER_URL || "http://localhost:7860");
}

export function setTryOnServerUrl(url) {
  try {
    if (clean(url)) localStorage.setItem(KEY, clean(url));
    else localStorage.removeItem(KEY);
  } catch {
    /* localStorage unavailable */
  }
}

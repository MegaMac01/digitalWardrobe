// Try-on provider config, resolved at runtime (saved in the browser).
// mode "local"  -> a self-hosted Gradio server (CatVTON now, FitDiT later)
// mode "cloud"  -> the tryOnOutfit Cloud Function (ModelsLab)
const MODE_KEY = "tryonMode";
const URL_KEY = "tryonServerUrl";

const clean = (url) => String(url || "").trim().replace(/\/+$/, "");

export function getTryOnMode() {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === "local" || saved === "cloud") return saved;
  } catch {
    /* localStorage unavailable */
  }
  return "local";
}

export function setTryOnMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode === "cloud" ? "cloud" : "local");
  } catch {
    /* localStorage unavailable */
  }
}

export function getTryOnServerUrl() {
  try {
    const saved = localStorage.getItem(URL_KEY);
    if (saved) return clean(saved);
  } catch {
    /* localStorage unavailable */
  }
  return clean(import.meta.env.VITE_TRYON_SERVER_URL || "http://localhost:7860");
}

export function setTryOnServerUrl(url) {
  try {
    if (clean(url)) localStorage.setItem(URL_KEY, clean(url));
    else localStorage.removeItem(URL_KEY);
  } catch {
    /* localStorage unavailable */
  }
}

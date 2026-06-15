# The Vintage Wardrobe

A React + Firebase app that styles outfits from your own closet. Open it in the
morning, it already knows your weather and location, you tap where you're going
(Beach, Work, Gym…), and it builds a look — powered by Claude when configured,
with a built-in rule engine as an automatic fallback.

## How it works

- **Today** — the home screen. Weather + greeting up top, one-tap occasion
  chips, and a generated outfit with *Shuffle*, *Save*, and *Wear today*.
- **Closet** — upload and tag your clothes (type, color, seasons, vibes, warmth,
  rain-friendly, favorite, notes). Filterable, paginated gallery.
- **Builder** — manual outfit builder with drag-to-reorder preview.
- **Planner** — weekly agenda + month calendar with drag-and-drop scheduling,
  conflict warnings, outfit editing, and undo on delete.
- **Profile** — closet stats and account.

## Features

- One-tap, weather-and-occasion aware outfit suggestions
- **AI stylist** via a Firebase Cloud Function calling the Claude API
  (graceful fallback to the local engine when not configured)
- **Automatic background removal** on upload — clothing is cut out to a clean
  transparent cutout, fully in-browser (no API key), with a toggle to disable it
- Client-side image resizing on upload (keeps Storage small)
- Mobile bottom navigation + desktop top nav
- Per-user Firestore subcollections + security rules
- Undo-on-delete for clothes and outfits
- Outfit editing (rename, swap items, notes)
- Email/password and Google auth
- PWA support (installable + offline shell cache)
- Vintage-inspired UI tuned for mobile + desktop

## Tech Stack

- React 19 + Vite + React Router
- MUI (Material UI)
- Firebase Auth + Firestore + Storage + Cloud Functions
- Anthropic Claude API (server-side, in the Cloud Function)

---

## Quick Start (local app)

The web app runs without any AI setup — it uses the built-in rule engine until
you enable the Cloud Function.

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure Firebase** — copy the example env file and fill in your project's
   web config (Firebase Console → Project settings → Your apps):
   ```bash
   cp .env.example .env.local
   ```
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   > If these are omitted, the app falls back to the values baked into
   > `src/firebase.js`. For your own deployment, always set your own.
3. **Run the dev server**
   ```bash
   npm run dev
   ```
4. **Build / preview / lint**
   ```bash
   npm run build
   npm run preview
   npm run lint
   ```

## Deploy Firestore & Storage rules

```bash
firebase deploy --only firestore:rules,storage
```

Rules live in `firestore.rules` and `storage.rules`. Data is stored per user
under `users/{uid}/clothes` and `users/{uid}/outfits`.

---

## Enable the AI Stylist (optional)

The AI stylist runs as a Cloud Function so your Claude API key never reaches the
browser. Until it's deployed, the app automatically uses the built-in engine —
you'll see a **"Built-in"** badge instead of **"AI stylist"** on suggestions.

**Requirements:** Firebase **Blaze** (pay-as-you-go) plan — Cloud Functions
require it. There's a generous free tier; you only pay for Claude API usage.

1. **Install function dependencies**
   ```bash
   cd functions
   npm install
   cd ..
   ```
2. **Set your Claude API key as a secret** (get one at
   https://console.anthropic.com):
   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
3. **Deploy the function**
   ```bash
   firebase deploy --only functions
   ```

Once deployed, the Today screen and Builder use Claude to pick outfits. To
change the model or cost profile, edit `MODEL` in
[`functions/index.js`](functions/index.js) (defaults to `claude-sonnet-4-6`;
swap to `claude-haiku-4-5` for lower cost or `claude-opus-4-8` for the most
capable model).

---

## Notes

- Weather uses browser geolocation + the free [Open-Meteo](https://open-meteo.com)
  API. If location is blocked, occasion/vibe suggestions still work.
- Client errors are logged to a `client_errors` Firestore collection with a
  30-day `expiresAt` field — add a Firestore TTL policy on that field to
  auto-clean old entries.
- The project id and aliases live in `.firebaserc` / `firebase.json`.

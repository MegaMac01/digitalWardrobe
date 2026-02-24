# Vintage Digital Wardrobe

A React + Firebase wardrobe app for:
- Uploading and tagging your clothes
- Building manual outfits
- Auto-generating outfits by current weather and vibe
- Saving looks for quick on-the-go use

## Features

- Email/password and Google auth
- Clothing upload with image + metadata:
  - Type, color, seasons, vibes, warmth, rain-friendly, favorite, notes
- Filterable wardrobe gallery
- Manual outfit builder with auto-pick assist
- Weather + vibe outfit suggestions (Open-Meteo)
- Saved outfits with delete support
- Vintage-inspired UI theme tuned for desktop + mobile

## Tech Stack

- React 19 + Vite
- React Router
- MUI
- Firebase Auth + Firestore + Storage

## Local Setup

1. Install deps
   - `npm install`
2. Run dev server
   - `npm run dev`
3. Build
   - `npm run build`
4. Lint
   - `npm run lint`

## Firebase Config

This app reads from `VITE_FIREBASE_*` env vars and falls back to the values in `src/firebase.js`.

Recommended `.env.local` keys:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Notes

- Weather suggestions use browser geolocation and Open-Meteo.
- If location is blocked, manual and vibe-based suggestions still work.

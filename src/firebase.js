import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCp4-en9yU0eGK2BPWtkHcFq0guJM25S3E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "digitalwardrobe-1c867.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "digitalwardrobe-1c867",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "digitalwardrobe-1c867.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "1016393841622",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:1016393841622:web:2d568d8bbc92b175834277",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

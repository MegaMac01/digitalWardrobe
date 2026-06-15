import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

const SENT_EVENTS = new Map();
const THROTTLE_MS = 8000;

function shouldSend(signature) {
  const now = Date.now();
  const lastSent = SENT_EVENTS.get(signature) ?? 0;
  if (now - lastSent < THROTTLE_MS) {
    return false;
  }
  SENT_EVENTS.set(signature, now);
  return true;
}

function toMessage(errorLike) {
  if (!errorLike) return "Unknown error";
  if (typeof errorLike === "string") return errorLike;
  if (errorLike instanceof Error) return errorLike.message || "Unknown error";
  if (typeof errorLike.message === "string") return errorLike.message;
  return JSON.stringify(errorLike);
}

export async function logClientError(errorLike, context = {}) {
  try {
    const message = toMessage(errorLike);
    const signature = `${context.scope ?? "app"}:${context.action ?? "unknown"}:${message}`;
    if (!shouldSend(signature)) {
      return;
    }

    const now = Date.now();
    // expiresAt enables a Firestore TTL policy to auto-delete after 30 days.
    // Set it up in Firebase Console: Firestore → Indexes → TTL, field: expiresAt
    await addDoc(collection(db, "client_errors"), {
      message: message.slice(0, 400),
      stack: typeof errorLike?.stack === "string" ? errorLike.stack.slice(0, 4000) : "",
      scope: String(context.scope ?? "app"),
      action: String(context.action ?? "unknown"),
      metadata: JSON.stringify(context.metadata ?? {}).slice(0, 3000),
      route: window.location?.pathname ?? "",
      userAgent: navigator.userAgent.slice(0, 250),
      createdAtMs: now,
      expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
    });
  } catch {
    // Never block user actions because of telemetry errors.
  }
}

let telemetryInstalled = false;

export function installGlobalTelemetry() {
  if (telemetryInstalled || typeof window === "undefined") return;
  telemetryInstalled = true;

  window.addEventListener("error", (event) => {
    logClientError(event.error ?? event.message, {
      scope: "window",
      action: "error",
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logClientError(event.reason, {
      scope: "window",
      action: "unhandledrejection",
    });
  });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeText(value, maxLength = 240) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email ?? "").trim().toLowerCase());
}

export function validatePassword(password) {
  const value = String(password ?? "");
  if (value.length < 8) {
    return "Use at least 8 characters.";
  }
  if (!/[A-Z]/.test(value)) {
    return "Add at least one uppercase letter.";
  }
  if (!/[a-z]/.test(value)) {
    return "Add at least one lowercase letter.";
  }
  if (!/\d/.test(value)) {
    return "Add at least one number.";
  }
  return "";
}

export function validateImageFile(file, maxMB = 10) {
  if (!file) {
    return "Please upload a clothing image.";
  }

  if (!file.type.startsWith("image/")) {
    return "Only image uploads are supported.";
  }

  const maxSizeBytes = maxMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `Image is too large. Keep it under ${maxMB} MB.`;
  }

  return "";
}

export function validateOutfitName(value) {
  const normalized = sanitizeText(value, 60);
  if (!normalized) {
    return "Name your outfit first.";
  }
  if (normalized.length < 3) {
    return "Use at least 3 characters.";
  }
  return "";
}

export function isISODate(dateISO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateISO ?? ""))) {
    return false;
  }
  const timestamp = Date.parse(`${dateISO}T00:00:00`);
  return Number.isFinite(timestamp);
}

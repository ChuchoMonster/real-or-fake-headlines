// Display name validation + light moderation.
// Rules: 3–20 chars, alphanumerics plus a few punctuation, no reserved names,
// no slurs/profanity (light list), no confusable unicode homoglyphs.

const RESERVED = new Set([
  "admin",
  "administrator",
  "mod",
  "moderator",
  "system",
  "support",
  "help",
  "staff",
  "official",
  "root",
  "owner",
  "realorfake",
  "realorfakeapp",
  "realorfakebot",
  "null",
  "undefined",
  "anonymous",
  "guest",
  "me",
  "you",
  "user",
  "team",
]);

// Minimal starter deny-list. Not exhaustive; intentionally small so false
// positives stay rare. Extend later if needed.
const DENY = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "rape",
  "nazi",
  "kike",
  "chink",
  "spic",
];

/**
 * Normalize confusable characters to their ASCII equivalents so "аdmin"
 * (Cyrillic а) can't slip through the reserved-name check. Also strip
 * zero-width characters and combining marks.
 */
export function normalizeName(input: string): string {
  // NFKD decomposition then strip diacritical marks
  let s = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  // Common cyrillic/greek/latin-look-alikes → latin
  const map: Record<string, string> = {
    "а": "a",
    "е": "e",
    "о": "o",
    "р": "p",
    "с": "c",
    "х": "x",
    "у": "y",
    "А": "a",
    "В": "b",
    "Е": "e",
    "К": "k",
    "М": "m",
    "Н": "h",
    "О": "o",
    "Р": "p",
    "С": "c",
    "Т": "t",
    "Х": "x",
    "α": "a",
    "ο": "o",
    "ρ": "p",
    "ν": "v",
    "ΐ": "i",
  };
  s = s
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("");
  // Strip zero-width and direction-override characters
  s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "");
  return s.toLowerCase();
}

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

/**
 * Validate a display name. Returns the canonicalized form on success
 * (whitespace trimmed, no internal normalization beyond trim so the user
 * still sees what they typed).
 */
export function validateDisplayName(raw: string): ValidationResult {
  const trimmed = raw.trim();

  if (trimmed.length < 3) {
    return { ok: false, reason: "Name must be at least 3 characters." };
  }
  if (trimmed.length > 20) {
    return { ok: false, reason: "Name must be 20 characters or fewer." };
  }

  // Allow letters, numbers, underscore, hyphen, period, space (one at a time).
  if (!/^[\p{L}\p{N}_. -]+$/u.test(trimmed)) {
    return {
      ok: false,
      reason: "Use letters, numbers, spaces, and _ . - only.",
    };
  }
  if (/\s{2,}/.test(trimmed)) {
    return { ok: false, reason: "Only one space between words." };
  }

  const normalized = normalizeName(trimmed);

  if (RESERVED.has(normalized.replace(/[\s._-]/g, ""))) {
    return { ok: false, reason: "That name is reserved. Try another." };
  }

  const stripped = normalized.replace(/[^a-z0-9]/g, "");
  for (const bad of DENY) {
    if (stripped.includes(bad)) {
      return { ok: false, reason: "That name isn't allowed. Try another." };
    }
  }

  return { ok: true, value: trimmed };
}

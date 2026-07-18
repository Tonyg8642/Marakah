export function formatArabicNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) {
    return "";
  }

  return new Intl.NumberFormat("ar").format(number);
}

const transliterationReplacements = [
  [/ā/g, "aa"],
  [/ī/g, "ee"],
  [/ū/g, "oo"],
  [/ḥ/g, "h"],
  [/ṣ/g, "s"],
  [/ḍ/g, "d"],
  [/ṭ/g, "t"],
  [/ẓ/g, "z"],
  [/ʿ/g, "'"],
  [/ʾ/g, "'"],
  [/â/g, "aa"],
  [/î/g, "ee"],
  [/û/g, "oo"],
];

export function toBeginnerTransliteration(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return "";
  }

  let normalized = raw;
  transliterationReplacements.forEach(([matcher, replacement]) => {
    normalized = normalized.replace(matcher, replacement);
  });

  return normalized
    .replace(/\s+/g, " ")
    .replace(/\s*[-]\s*/g, "-")
    .trim();
}

export function toSlowPronunciation(input) {
  const beginner = toBeginnerTransliteration(input);
  if (!beginner) {
    return "";
  }

  return beginner
    .replace(/([aeiou]{2,})/gi, "-$1-")
    .replace(/\s+/g, " ")
    .replace(/--+/g, "-")
    .replace(/(^-|-$)/g, "")
    .trim();
}

function uniqueKeyForAyah(ayah) {
  return `${ayah.surahNumber}:${ayah.ayahNumber}`;
}

export function validateSurahData(surah) {
  const issues = [];
  if (!surah || typeof surah !== "object") {
    issues.push("Surah metadata is missing or invalid.");
    return issues;
  }

  if (
    !Number.isInteger(Number(surah.number)) ||
    surah.number < 1 ||
    surah.number > 114
  ) {
    issues.push(`Invalid surah number: ${surah.number}`);
  }

  return issues;
}

export function validateQuranPage(page) {
  const issues = [];
  if (!page || typeof page !== "object") {
    return ["Page payload is missing."];
  }

  if (
    !Number.isInteger(Number(page.pageNumber)) ||
    Number(page.pageNumber) < 1
  ) {
    issues.push("Invalid Quran page number.");
  }

  if (!Array.isArray(page.ayahs) || !page.ayahs.length) {
    issues.push("Quran page has no ayahs.");
    return issues;
  }

  const seen = new Set();
  page.ayahs.forEach((ayah) => {
    if (!ayah.arabic) {
      issues.push(
        `Missing Arabic text for ${ayah.surahNumber}:${ayah.ayahNumber}`,
      );
    }

    const key = uniqueKeyForAyah(ayah);
    if (seen.has(key)) {
      issues.push(`Duplicate ayah detected: ${key}`);
    }
    seen.add(key);
  });

  return issues;
}

export function validateAyahData(ayah) {
  const issues = [];
  if (!ayah) {
    return ["Missing ayah payload."];
  }

  if (
    !Number.isInteger(Number(ayah.surahNumber)) ||
    !Number.isInteger(Number(ayah.ayahNumber))
  ) {
    issues.push("Ayah identifiers are invalid.");
  }

  if (!ayah.arabic) {
    issues.push("Ayah Arabic text is missing.");
  }

  if (Array.isArray(ayah.words)) {
    const positions = new Set();
    ayah.words.forEach((word) => {
      if (
        !Number.isInteger(Number(word.position)) ||
        Number(word.position) < 1
      ) {
        issues.push(
          `Invalid word position for ${ayah.surahNumber}:${ayah.ayahNumber}`,
        );
      }

      const position = Number(word.position);
      if (positions.has(position)) {
        issues.push(
          `Duplicate word position ${position} for ${ayah.surahNumber}:${ayah.ayahNumber}`,
        );
      }
      positions.add(position);
    });
  }

  return issues;
}

export function validateQuranData({ surahs, page }) {
  const issues = [];

  if (Array.isArray(surahs)) {
    if (surahs.length !== 114) {
      issues.push(`Expected 114 surahs, received ${surahs.length}.`);
    }

    surahs.forEach((surah) => {
      issues.push(...validateSurahData(surah));
    });
  }

  if (page) {
    issues.push(...validateQuranPage(page));
    page.ayahs.forEach((ayah) => {
      issues.push(...validateAyahData(ayah));
    });
  }

  return issues;
}

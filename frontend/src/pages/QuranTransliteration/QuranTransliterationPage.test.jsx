import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuranTransliterationPage from "./QuranTransliterationPage";

vi.mock("../../contexts/LanguageContext", () => ({
  useLanguagePreference: () => ({
    preferredLanguageTag: "en",
  }),
}));

vi.mock("../../contexts/PageTranslationContext", () => ({
  usePageTranslation: () => ({
    translationEnabled: false,
  }),
}));

vi.mock("../../services/quranService", () => ({
  getSurahs: vi.fn(async () => [
    {
      number: 55,
      nameArabic: "الرحمن",
      nameBeginner: "Ar-Rahman",
      numberOfAyahs: 78,
      startPage: 531,
      meaning: { en: "The Most Gracious" },
    },
  ]),
  getTransliterationQuranPage: vi.fn(async () => ({
    pageNumber: 531,
    ayahs: [
      {
        surahNumber: 55,
        ayahNumber: 1,
        arabic: "ٱلرَّحْمَٰنُ",
        beginnerTransliteration: "Ar Rahmaan",
        slowTransliteration: "Ar Rah-maan",
        meanings: { en: "The Most Compassionate" },
        words: [
          {
            position: 1,
            arabic: "ٱلرَّحْمَٰنُ",
            beginnerTransliteration: "Ar Rahmaan",
            slowTransliteration: "Ar Rah-maan",
            meanings: { en: "The Most Compassionate" },
          },
        ],
      },
    ],
  })),
  getPageForSurah: vi.fn(async () => 531),
}));

vi.mock("../../services/quranTranslationService", () => ({
  getAyahMeaningsByPage: vi.fn(async () => new Map()),
}));

describe("QuranTransliterationPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders compact transliteration sheet and supports optional Arabic toggle", async () => {
    render(
      <MemoryRouter initialEntries={["/quran-transliteration?page=531"]}>
        <Routes>
          <Route
            path="/quran-transliteration"
            element={<QuranTransliterationPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Ar-Rahman (55)")).toBeInTheDocument();
    });

    expect(screen.getByText("Ar Rahmaan")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Show Arabic"));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Hide Arabic" }),
      ).toBeInTheDocument();
    });
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuranPage from "./QuranPage";

vi.mock("../../contexts/LanguageContext", () => ({
  useLanguagePreference: () => ({
    preferredLanguageTag: "en",
  }),
}));

vi.mock("../../contexts/PageTranslationContext", () => ({
  usePageTranslation: () => ({
    translationEnabled: false,
    transliterationEnabled: false,
  }),
}));

vi.mock("../../services/quranService", () => ({
  getSurahs: vi.fn(async () => [
    {
      number: 1,
      nameArabic: "الفاتحة",
      nameBeginner: "Al-Fatihah",
      numberOfAyahs: 7,
      startPage: 1,
      meaning: { en: "The Opening" },
    },
  ]),
  getArabicQuranPage: vi.fn(async () => ({
    pageNumber: 1,
    ayahs: [
      {
        surahNumber: 1,
        ayahNumber: 1,
        arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      },
    ],
  })),
  getPageForSurah: vi.fn(async () => 1),
}));

vi.mock("../../services/quranTranslationService", () => ({
  getAyahMeaningsByPage: vi.fn(async () => new Map()),
}));

describe("QuranPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders real Arabic reader shell with page controls", async () => {
    render(
      <MemoryRouter initialEntries={["/quran?page=1"]}>
        <Routes>
          <Route path="/quran" element={<QuranPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "الفاتحة" }),
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText(/بِسْمِ اللَّهِ/).length).toBeGreaterThan(0);

    expect(
      screen.getByRole("button", { name: "Previous Page" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Next Page" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Page 1")).toBeInTheDocument();
  });
});

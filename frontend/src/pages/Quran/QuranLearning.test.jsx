import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuranLearning from "./QuranLearning";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key, options) => options?.defaultValue || _key,
  }),
}));

function buildResponse(payload) {
  return {
    ok: true,
    json: async () => payload,
  };
}

describe("QuranLearning", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads dataset-driven ayah cards and keeps Arabic section visible", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith("/quran-learning/manifest.json")) {
        return buildResponse({
          version: "1",
          datasetStatus: "ready",
          sources: {},
        });
      }

      if (String(url).endsWith("/quran-learning/surah-index.json")) {
        return buildResponse({
          surahs: [
            {
              surahNumber: 36,
              arabicName: "يس",
              englishName: "Ya-Sin",
              transliterationName: "Ya Seen",
              ayahCount: 2,
            },
          ],
        });
      }

      if (String(url).endsWith("/quran-learning/surahs/36.json")) {
        return buildResponse({
          surahNumber: 36,
          arabicName: "يس",
          englishName: "Ya-Sin",
          transliterationName: "Ya Seen",
          ayahCount: 2,
          ayahs: [
            {
              ayahNumber: 1,
              arabicText: "ARABIC_PLACEHOLDER",
              beginnerPronunciation: "Beginner pronunciation",
              fullTranslation: "Full meaning sentence",
              words: [
                {
                  position: 1,
                  arabic: "W1",
                  pronunciation: "Word one",
                  meaning: "Meaning one",
                },
              ],
            },
          ],
        });
      }

      return {
        ok: false,
        json: async () => ({}),
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<QuranLearning />);

    expect(
      screen.getByRole("heading", { name: "Beginner Quran Reading Guide" }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Ayah 1" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Beginner pronunciation")).toBeInTheDocument();
    expect(screen.getByText("Full meaning sentence")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "W1" })).toBeInTheDocument();
  });

  it("persists learning settings to localStorage", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith("/quran-learning/manifest.json")) {
        return buildResponse({
          version: "1",
          datasetStatus: "ready",
          sources: {},
        });
      }

      if (String(url).endsWith("/quran-learning/surah-index.json")) {
        return buildResponse({
          surahs: [
            {
              surahNumber: 1,
              arabicName: "A",
              englishName: "Alpha",
              transliterationName: "Alpha",
              ayahCount: 1,
            },
          ],
        });
      }

      if (String(url).endsWith("/quran-learning/surahs/1.json")) {
        return buildResponse({
          surahNumber: 1,
          arabicName: "A",
          englishName: "Alpha",
          transliterationName: "Alpha",
          ayahCount: 1,
          ayahs: [
            {
              ayahNumber: 1,
              arabicText: "AR",
              beginnerPronunciation: "PR",
              fullTranslation: "TR",
              words: [
                {
                  position: 1,
                  arabic: "AR1",
                  pronunciation: "PR1",
                  meaning: "ME1",
                },
              ],
            },
          ],
        });
      }

      return {
        ok: false,
        json: async () => ({}),
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<QuranLearning />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Ayah 1" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Hide Pronunciation"));
    fireEvent.click(screen.getByLabelText("Show Arabic Word Matching"));

    const stored = JSON.parse(
      localStorage.getItem("marakah_quran_learning_settings") || "{}",
    );

    expect(stored.showPronunciation).toBe(false);
    expect(stored.showArabicWordMatching).toBe(true);
  });
});

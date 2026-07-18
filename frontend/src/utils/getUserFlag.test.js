import { describe, expect, it } from "vitest";
import { __internalNormalizeIdentityValue, getUserFlag } from "./getUserFlag";

describe("getUserFlag", () => {
  it("returns explicit flagUrl when provided", () => {
    expect(
      getUserFlag({
        flagUrl: "https://example.com/custom-flag.webp",
        country: "Ethiopia",
        ethnicity: "Mexican",
      }),
    ).toBe("https://example.com/custom-flag.webp");
  });

  it("resolves a flag from country when no explicit flagUrl exists", () => {
    expect(getUserFlag({ country: "Mexico" })).toBe(
      "https://flagcdn.com/mx.svg",
    );
  });

  it("resolves a flag from ethnicity when country is missing", () => {
    expect(getUserFlag({ ethnicity: "Pakistani" })).toBe(
      "https://flagcdn.com/pk.svg",
    );
  });

  it("supports case-insensitive matching and extra spaces", () => {
    expect(getUserFlag({ country: "   ethiopia   " })).toBe(
      "https://flagcdn.com/et.svg",
    );
  });

  it("supports alternate names from identity data", () => {
    expect(getUserFlag({ country: "Czechia" })).toBe(
      "https://flagcdn.com/cz.svg",
    );
  });

  it("returns null when no known mapping exists", () => {
    expect(getUserFlag({ country: "Unknown Place" })).toBeNull();
  });

  it("normalizes punctuation and spacing safely", () => {
    expect(__internalNormalizeIdentityValue("  United-States  ")).toBe(
      "united states",
    );
  });
});

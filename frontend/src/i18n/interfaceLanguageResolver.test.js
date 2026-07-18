import { describe, expect, it } from "vitest";
import { resolveInterfaceLanguage } from "./interfaceLanguageResolver";

const sampleCatalog = [
  {
    id: "arabic-moroccan",
    tag: "ar-MA",
    baseLanguage: "ar",
    direction: "rtl",
    interfaceStatus: "fallback",
    fallbackTag: "ar",
    fallbackChain: ["ar-MA", "ar", "en"],
  },
  {
    id: "arabic-msa",
    tag: "ar",
    baseLanguage: "ar",
    direction: "rtl",
    interfaceStatus: "full",
    fallbackTag: "ar",
  },
  {
    id: "somali",
    tag: "so",
    baseLanguage: "so",
    direction: "ltr",
    interfaceStatus: "full",
    fallbackTag: "so",
    fallbackChain: ["so", "en"],
  },
];

describe("resolveInterfaceLanguage", () => {
  it("resolves dialect fallback chain for ar-MA", () => {
    const result = resolveInterfaceLanguage("ar-MA", sampleCatalog);

    expect(result.requestedTag).toBe("ar-MA");
    expect(result.interfaceTag).toBe("ar");
    expect(result.direction).toBe("rtl");
    expect(result.exactInterfaceSupported).toBe(false);
    expect(result.fallbackChain).toEqual(
      expect.arrayContaining(["ar-MA", "ar", "en"]),
    );
  });

  it("keeps exact interface support for so", () => {
    const result = resolveInterfaceLanguage("so", sampleCatalog);

    expect(result.requestedTag).toBe("so");
    expect(result.interfaceTag).toBe("so");
    expect(result.direction).toBe("ltr");
    expect(result.exactInterfaceSupported).toBe(true);
    expect(result.fallbackChain).toEqual(expect.arrayContaining(["so", "en"]));
  });
});

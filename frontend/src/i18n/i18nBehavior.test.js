import i18n, { loadLocaleResources } from "./index";

describe("i18n behavior", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("supports language switching", async () => {
    await loadLocaleResources("es");
    await i18n.changeLanguage("es");
    expect(i18n.language).toBe("es");
    expect(i18n.t("auth.createAccount")).toBe("Crear cuenta");
  });

  it("uses fallback language resources for unsupported locales", async () => {
    await i18n.changeLanguage("zz");
    expect(i18n.t("auth.createAccount")).toBe("Create Account");
  });
});

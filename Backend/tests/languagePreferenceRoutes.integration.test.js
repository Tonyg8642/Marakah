const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

function clearBackendModuleCache() {
  const modulePaths = [
    "../server",
    "../routes/preferenceRoutes",
    "../controllers/preferenceController",
    "../models/UserPreference",
    "../services/languageCatalogService",
  ];

  for (const modulePath of modulePaths) {
    const resolved = require.resolve(modulePath, { paths: [__dirname] });
    delete require.cache[resolved];
  }
}

test.describe("Language preference routes integration", () => {
  let app = null;

  test.beforeEach(() => {
    clearBackendModuleCache();
    const { createApp } = require("../server");
    app = createApp();
  });

  test("returns shared language catalog excluding quranic Arabic", async () => {
    const response = await request(app).get("/api/preferences/languages");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(Array.isArray(response.body.languages));
    assert.ok(response.body.languages.length >= 10);

    const ids = response.body.languages.map((entry) => entry.id);
    assert.ok(ids.includes("arabic-moroccan"));
    assert.ok(!ids.includes("quranic-arabic"));
  });

  test("accepts dialect BCP47 tags for preferred language", async () => {
    const putResponse = await request(app)
      .put("/api/preferences/language")
      .send({
        identifier: "dialect-user@example.com",
        preferredLanguage: "ar-MA",
      });

    assert.equal(putResponse.status, 200);
    assert.equal(putResponse.body.success, true);
    assert.equal(putResponse.body.preferredLanguage, "ar-MA");
    assert.equal(putResponse.body.preferredLanguageId, "arabic-moroccan");

    const getResponse = await request(app)
      .get("/api/preferences/language")
      .query({ identifier: "dialect-user@example.com" });

    assert.equal(getResponse.status, 200);
    assert.equal(getResponse.body.success, true);
    assert.equal(getResponse.body.preferredLanguage, "ar-MA");
    assert.equal(getResponse.body.preferredLanguageId, "arabic-moroccan");
  });

  test("rejects unknown language tags", async () => {
    const response = await request(app).put("/api/preferences/language").send({
      identifier: "dialect-user@example.com",
      preferredLanguage: "zz-QQ",
    });

    assert.equal(response.status, 400);
    assert.match(response.body.message, /supported preferredLanguage/i);
  });
});

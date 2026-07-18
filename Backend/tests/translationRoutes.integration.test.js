const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

function clearBackendModuleCache() {
  const modulePaths = [
    "../server",
    "../routes/translationRoutes",
    "../controllers/translationController",
    "../services/translationService",
    "../services/languageCatalogService",
  ];

  for (const modulePath of modulePaths) {
    const resolved = require.resolve(modulePath, { paths: [__dirname] });
    delete require.cache[resolved];
  }
}

test.describe("Translation routes integration", () => {
  let app = null;

  test.beforeEach(() => {
    clearBackendModuleCache();
    const { createApp } = require("../server");
    app = createApp();
  });

  test("resolves Moroccan Arabic to standard Arabic provider target", async () => {
    const response = await request(app).post("/api/translation/resolve").send({
      requestedTargetTag: "ar-MA",
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.requestedTag, "ar-MA");
    assert.equal(response.body.providerTag, "ar");
    assert.equal(response.body.exactDialectSupported, false);
    assert.match(
      response.body.displayNotice,
      /exact moroccan arabic output is unavailable/i,
    );
  });

  test("rejects Quranic Arabic in the general translation route", async () => {
    const response = await request(app).post("/api/translation/resolve").send({
      requestedTargetTag: "ar-x-quranic",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  });

  test("translate endpoint fails safely when provider is not configured", async () => {
    const response = await request(app)
      .post("/api/translation/translate")
      .send({
        text: "Community dinner this Friday",
        requestedTargetTag: "ar-MA",
        sourceLanguage: "en",
        identifier: "test-user@example.com",
      });

    assert.equal(response.status, 503);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /not configured/i);
  });
});

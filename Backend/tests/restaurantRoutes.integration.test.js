const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

function clearBackendModuleCache() {
  const modulePaths = [
    "../server",
    "../routes/restaurantRoutes",
    "../controllers/restaurantController",
    "../services/googlePlacesService",
    "../services/googleRoutesService",
    "../services/halalCuisineConfigService",
  ];

  for (const modulePath of modulePaths) {
    const resolved = require.resolve(modulePath, { paths: [__dirname] });
    delete require.cache[resolved];
  }
}

test.describe("Restaurant routes", () => {
  test.beforeEach(() => {
    clearBackendModuleCache();
  });

  test("returns shared halal cuisine configuration", async () => {
    const { createApp } = require("../server");
    const app = createApp();

    const response = await request(app).get("/api/restaurants/cuisines");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(Array.isArray(response.body.cuisines));
    assert.ok(response.body.cuisines.some((item) => item.id === "all-halal"));
    assert.ok(
      response.body.cuisines.some((item) => item.id === "halal-mexican"),
    );
  });

  test("rejects unsupported cuisine id", async () => {
    const { createApp } = require("../server");
    const app = createApp();

    const response = await request(app).get("/api/restaurants/search").query({
      city: "Chicago",
      cuisine: "unknown-cuisine",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /Unsupported cuisine id/i);
  });
});

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

function clearBackendModuleCache() {
  const modulePaths = [
    "../server",
    "../routes/youtubeRoutes",
    "../controllers/youtubeController",
    "../services/youtubePlaylistService",
  ];

  for (const modulePath of modulePaths) {
    const resolved = require.resolve(modulePath, { paths: [__dirname] });
    delete require.cache[resolved];
  }
}

test.describe("YouTube playlist routes integration", () => {
  let app = null;
  const originalFetch = global.fetch;

  test.beforeEach(() => {
    clearBackendModuleCache();
    delete process.env.YOUTUBE_API_KEY;
    const { createApp } = require("../server");
    app = createApp();
  });

  test.afterEach(() => {
    global.fetch = originalFetch;
  });

  test("returns controlled response when API key is missing", async () => {
    const response = await request(app).get(
      "/api/youtube/sister-badia-playlist",
    );

    assert.equal(response.status, 503);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.message,
      "The video series is temporarily unavailable.",
    );
    assert.deepEqual(response.body.videos, []);
  });

  test("returns sorted playlist videos and filters private/deleted entries", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";

    global.fetch = async (url) => {
      const parsed = new URL(url);
      const pageToken = parsed.searchParams.get("pageToken") || "";

      if (!pageToken) {
        return {
          ok: true,
          json: async () => ({
            nextPageToken: "next-page",
            items: [
              {
                snippet: {
                  position: 1,
                  title: "Session B",
                  channelTitle: "Sister Badia Khazaal",
                  resourceId: {
                    videoId: "video-b",
                  },
                  thumbnails: {
                    high: {
                      url: "https://img.youtube.com/vi/video-b/hqdefault.jpg",
                    },
                  },
                },
                status: { privacyStatus: "public" },
              },
              {
                snippet: {
                  position: 2,
                  title: "Private video",
                  resourceId: { videoId: "private" },
                },
                status: { privacyStatus: "private" },
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: {
                position: 0,
                title: "Session A",
                channelTitle: "Sister Badia Khazaal",
                resourceId: {
                  videoId: "video-a",
                },
                thumbnails: {
                  high: {
                    url: "https://img.youtube.com/vi/video-a/hqdefault.jpg",
                  },
                },
              },
              status: { privacyStatus: "public" },
            },
            {
              snippet: {
                position: 3,
                title: "Deleted video",
                resourceId: { videoId: "deleted" },
              },
              status: { privacyStatus: "public" },
            },
          ],
        }),
      };
    };

    clearBackendModuleCache();
    const { createApp } = require("../server");
    app = createApp();

    const response = await request(app).get(
      "/api/youtube/sister-badia-playlist",
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.videos.length, 2);
    assert.equal(response.body.videos[0].youtubeVideoId, "video-a");
    assert.equal(response.body.videos[0].sessionNumber, 1);
    assert.equal(response.body.videos[1].youtubeVideoId, "video-b");
    assert.equal(response.body.videos[1].sessionNumber, 2);
  });
});

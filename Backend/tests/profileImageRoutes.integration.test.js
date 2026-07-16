const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const request = require("supertest");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function makeAuthHeader(identifier) {
  return {
    "x-marakah-identifier": identifier,
  };
}

function clearBackendModuleCache() {
  const modulePaths = [
    "../server",
    "../routes/preferenceRoutes",
    "../controllers/preferenceController",
    "../services/profileImageStorageService",
  ];

  for (const modulePath of modulePaths) {
    const resolved = require.resolve(modulePath, { paths: [__dirname] });
    delete require.cache[resolved];
  }
}

function getTestImageBuffer() {
  return Buffer.from("RIFF_TEST_IMAGE_BYTES");
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

test.describe("Profile image routes integration", () => {
  let tempRoot = "";
  let app = null;

  test.beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "marakah-avatar-test-"));
    process.env.PROFILE_IMAGE_BACKEND_ROOT = tempRoot;
    process.env.PROFILE_IMAGE_UPLOAD_ROOT = path.join(
      tempRoot,
      "isolated-uploads",
    );
    process.env.PROFILE_IMAGE_PUBLIC_PREFIX = "/uploads/profile-avatars";

    clearBackendModuleCache();
    const { createApp } = require("../server");
    app = createApp();
  });

  test.afterEach(async () => {
    delete process.env.PROFILE_IMAGE_BACKEND_ROOT;
    delete process.env.PROFILE_IMAGE_UPLOAD_ROOT;
    delete process.env.PROFILE_IMAGE_PUBLIC_PREFIX;

    await fs.rm(tempRoot, { recursive: true, force: true });
    assert.equal(await pathExists(tempRoot), false);
  });

  test("uploads valid JPEG, PNG, and WebP for authenticated user", async () => {
    const identifier = "tester";

    for (const [filename, contentType] of [
      ["avatar.jpg", "image/jpeg"],
      ["avatar.png", "image/png"],
      ["avatar.webp", "image/webp"],
    ]) {
      const response = await request(app)
        .post("/api/preferences/profile-image")
        .set(makeAuthHeader(identifier))
        .field("identifier", identifier)
        .attach("profileImage", getTestImageBuffer(), {
          filename,
          contentType,
        });

      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.profileImage.fileType, contentType);
      assert.match(
        response.body.profileImage.storagePath,
        /^isolated-uploads\//,
      );
      assert.equal(
        await pathExists(
          path.join(tempRoot, response.body.profileImage.storagePath),
        ),
        true,
      );
    }
  });

  test("rejects unsupported formats and oversized files", async () => {
    const identifier = "tester";

    const unsupported = await request(app)
      .post("/api/preferences/profile-image")
      .set(makeAuthHeader(identifier))
      .field("identifier", identifier)
      .attach("profileImage", Buffer.from("not-image"), {
        filename: "avatar.txt",
        contentType: "text/plain",
      });

    assert.equal(unsupported.status, 400);
    assert.match(unsupported.body.message, /JPEG|PNG|WebP/i);

    const oversized = await request(app)
      .post("/api/preferences/profile-image")
      .set(makeAuthHeader(identifier))
      .field("identifier", identifier)
      .attach("profileImage", Buffer.alloc(MAX_IMAGE_BYTES + 1, 1), {
        filename: "avatar.jpg",
        contentType: "image/jpeg",
      });

    assert.equal(oversized.status, 400);
    assert.match(oversized.body.message, /smaller than 5 MB/i);
  });

  test("rejects unauthenticated and mismatched authenticated requests", async () => {
    const unauthenticated = await request(app)
      .post("/api/preferences/profile-image")
      .field("identifier", "tester")
      .attach("profileImage", getTestImageBuffer(), {
        filename: "avatar.jpg",
        contentType: "image/jpeg",
      });

    assert.equal(unauthenticated.status, 401);

    const mismatched = await request(app)
      .post("/api/preferences/profile-image")
      .set(makeAuthHeader("another-user"))
      .field("identifier", "tester")
      .attach("profileImage", getTestImageBuffer(), {
        filename: "avatar.jpg",
        contentType: "image/jpeg",
      });

    assert.equal(mismatched.status, 403);
  });

  test("stores profile image on correct user record and supports replacement cleanup", async () => {
    const identifier = "tester";

    const firstUpload = await request(app)
      .post("/api/preferences/profile-image")
      .set(makeAuthHeader(identifier))
      .field("identifier", identifier)
      .attach("profileImage", getTestImageBuffer(), {
        filename: "avatar.jpg",
        contentType: "image/jpeg",
      });

    assert.equal(firstUpload.status, 200);
    const firstStoragePath = firstUpload.body.profileImage.storagePath;

    const secondUpload = await request(app)
      .post("/api/preferences/profile-image")
      .set(makeAuthHeader(identifier))
      .field("identifier", identifier)
      .attach("profileImage", getTestImageBuffer(), {
        filename: "avatar-replacement.jpg",
        contentType: "image/jpeg",
      });

    assert.equal(secondUpload.status, 200);
    const secondStoragePath = secondUpload.body.profileImage.storagePath;
    assert.notEqual(secondStoragePath, firstStoragePath);

    const loadedRecord = await request(app)
      .get(
        `/api/preferences/profile-image?identifier=${encodeURIComponent(identifier)}`,
      )
      .set(makeAuthHeader(identifier));

    assert.equal(loadedRecord.status, 200);
    assert.equal(loadedRecord.body.success, true);
    assert.equal(loadedRecord.body.profileImage.storagePath, secondStoragePath);
    assert.equal(
      await pathExists(path.join(tempRoot, firstStoragePath)),
      false,
    );
    assert.equal(
      await pathExists(path.join(tempRoot, secondStoragePath)),
      true,
    );
  });

  test("removes profile image and safely handles missing avatar", async () => {
    const identifier = "tester";

    const upload = await request(app)
      .post("/api/preferences/profile-image")
      .set(makeAuthHeader(identifier))
      .field("identifier", identifier)
      .attach("profileImage", getTestImageBuffer(), {
        filename: "avatar.jpg",
        contentType: "image/jpeg",
      });

    assert.equal(upload.status, 200);
    const storagePath = upload.body.profileImage.storagePath;

    const removeResponse = await request(app)
      .delete("/api/preferences/profile-image")
      .set(makeAuthHeader(identifier))
      .send({ identifier });

    assert.equal(removeResponse.status, 200);
    assert.equal(removeResponse.body.success, true);
    assert.equal(await pathExists(path.join(tempRoot, storagePath)), false);

    const loadedRecord = await request(app)
      .get(
        `/api/preferences/profile-image?identifier=${encodeURIComponent(identifier)}`,
      )
      .set(makeAuthHeader(identifier));
    assert.equal(loadedRecord.body.profileImage, null);

    const removeAgain = await request(app)
      .delete("/api/preferences/profile-image")
      .set(makeAuthHeader(identifier))
      .send({ identifier });

    assert.equal(removeAgain.status, 200);
    assert.equal(removeAgain.body.success, true);
  });

  test("prevents path traversal and filename collisions across users", async () => {
    const firstUser = "tester-a";
    const secondUser = "tester-b";

    const firstUpload = await request(app)
      .post("/api/preferences/profile-image")
      .set(makeAuthHeader(firstUser))
      .field("identifier", firstUser)
      .attach("profileImage", getTestImageBuffer(), {
        filename: "../../../../avatar.jpg",
        contentType: "image/jpeg",
      });

    const secondUpload = await request(app)
      .post("/api/preferences/profile-image")
      .set(makeAuthHeader(secondUser))
      .field("identifier", secondUser)
      .attach("profileImage", getTestImageBuffer(), {
        filename: "../../../../avatar.jpg",
        contentType: "image/jpeg",
      });

    assert.equal(firstUpload.status, 200);
    assert.equal(secondUpload.status, 200);

    const firstPath = path.join(
      tempRoot,
      firstUpload.body.profileImage.storagePath,
    );
    const secondPath = path.join(
      tempRoot,
      secondUpload.body.profileImage.storagePath,
    );
    assert.notEqual(firstPath, secondPath);

    const rootResolved = path.resolve(tempRoot);
    const firstResolved = path.resolve(firstPath);
    const secondResolved = path.resolve(secondPath);
    assert.equal(firstResolved.startsWith(`${rootResolved}${path.sep}`), true);
    assert.equal(secondResolved.startsWith(`${rootResolved}${path.sep}`), true);
    assert.equal(await pathExists(firstResolved), true);
    assert.equal(await pathExists(secondResolved), true);
  });
});

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

function sanitizeIdentifierForPath(identifier) {
  return String(identifier || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getImageExtension(fileType) {
  switch (fileType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "";
  }
}

function toPosixPath(value) {
  return String(value || "")
    .split(path.sep)
    .join("/");
}

function resolveInside(baseDir, relativePath) {
  const baseResolved = path.resolve(baseDir);
  const candidate = path.resolve(baseResolved, relativePath || "");
  const safePrefix = `${baseResolved}${path.sep}`;

  if (candidate !== baseResolved && !candidate.startsWith(safePrefix)) {
    return null;
  }

  return candidate;
}

function createProfileImageStorageService(options = {}) {
  const backendRoot = path.resolve(
    options.backendRoot || path.join(__dirname, ".."),
  );
  const uploadRoot = path.resolve(
    options.uploadRoot || path.join(backendRoot, "uploads", "profile-avatars"),
  );
  const publicPrefix = String(
    options.publicPrefix || "/uploads/profile-avatars",
  ).replace(/\/+$/, "");

  // Local filesystem is acceptable for development/self-hosting only.
  // Replace this provider with managed object storage before multi-instance production.
  async function uploadProfileImage({
    identifier,
    fileBuffer,
    fileType,
    originalFileName,
  }) {
    const extension = getImageExtension(fileType);
    if (!extension) {
      throw new Error("Unsupported image format.");
    }

    const safeIdentifier = sanitizeIdentifierForPath(identifier) || "guest";
    const userDirectory = path.join(uploadRoot, safeIdentifier);
    await fs.mkdir(userDirectory, { recursive: true });

    const generatedFileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const absolutePath = path.join(userDirectory, generatedFileName);
    await fs.writeFile(absolutePath, fileBuffer);

    const storagePath = toPosixPath(path.relative(backendRoot, absolutePath));
    const imageUrl = `${publicPrefix}/${safeIdentifier}/${generatedFileName}`;

    return {
      storageProvider: "local-filesystem",
      storagePath,
      imageUrl,
      fileName: String(originalFileName || generatedFileName),
      fileType,
    };
  }

  async function deleteProfileImage(storagePath) {
    const safeAbsolute = resolveInside(backendRoot, storagePath);
    if (!safeAbsolute) {
      return false;
    }

    try {
      await fs.unlink(safeAbsolute);
      return true;
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return false;
      }

      throw error;
    }
  }

  function getProfileImageUrl(storagePath) {
    const safeAbsolute = resolveInside(backendRoot, storagePath);
    if (!safeAbsolute) {
      return "";
    }

    const relativeFromUploadRoot = path.relative(uploadRoot, safeAbsolute);
    if (!relativeFromUploadRoot || relativeFromUploadRoot.startsWith("..")) {
      return "";
    }

    return `${publicPrefix}/${toPosixPath(relativeFromUploadRoot)}`;
  }

  return {
    uploadProfileImage,
    deleteProfileImage,
    getProfileImageUrl,
    sanitizeIdentifierForPath,
    getImageExtension,
    getUploadRoot: () => uploadRoot,
  };
}

module.exports = {
  createProfileImageStorageService,
  getImageExtension,
};

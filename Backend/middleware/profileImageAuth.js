function normalizeIdentifier(rawValue) {
  return String(rawValue || "")
    .trim()
    .toLowerCase();
}

function requireProfileImageAuth(req, res, next) {
  const authIdentifier = normalizeIdentifier(
    req.headers["x-marakah-identifier"] || req.headers["x-user-identifier"],
  );
  const targetIdentifier = normalizeIdentifier(
    req.body?.identifier || req.query?.identifier,
  );

  if (!authIdentifier) {
    return res.status(401).json({
      success: false,
      message: "Authentication is required.",
    });
  }

  if (targetIdentifier && authIdentifier !== targetIdentifier) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to modify this profile image.",
    });
  }

  req.authenticatedIdentifier = authIdentifier;

  return next();
}

module.exports = {
  requireProfileImageAuth,
};

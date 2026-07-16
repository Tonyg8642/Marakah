const test = require("node:test");
const assert = require("node:assert/strict");
const {
  identityConfig,
  sanitizeIdentityPreference,
  validateIdentityPreference,
} = require("../utils/identityValidation");

test("identity config includes many identities", () => {
  assert.ok(identityConfig.length > 250);
});

test("prefer-not-to-say is exclusive", () => {
  const safe = sanitizeIdentityPreference({
    ethnicityIds: ["mexican", "prefer-not-to-say"],
    customEthnicities: ["Custom"],
  });

  assert.deepEqual(safe.ethnicityIds, ["prefer-not-to-say"]);
  assert.deepEqual(safe.customEthnicities, []);
  assert.equal(safe.preferNotToSay, true);
});

test("other identity requires custom entry", () => {
  const result = validateIdentityPreference({
    ethnicityIds: ["other-identity"],
    customEthnicities: [],
  });

  assert.equal(result.valid, false);
});

test("duplicate custom entries are deduped case-insensitively", () => {
  const safe = sanitizeIdentityPreference({
    ethnicityIds: ["other-identity"],
    customEthnicities: [" Amazigh ", "amazigh", "Amazigh"],
  });

  assert.deepEqual(safe.customEthnicities, ["Amazigh"]);
});

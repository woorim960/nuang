import assert from "node:assert/strict";
import test from "node:test";
import {
  isMobileOAuthCallback,
  parseMobileOAuthCallback,
  parseNuangAppLink,
} from "../src/app-link-contract.js";

test("accepts reviewed NUANG destinations and preserves query/hash", () => {
  assert.deepEqual(
    parseNuangAppLink("https://nuang.app/share/g1.token?from=kakao#report"),
    {
      href: "https://nuang.app/share/g1.token?from=kakao#report",
      path: "/share/g1.token?from=kakao#report",
    },
  );
  assert.equal(parseNuangAppLink("https://nuang.app/home")?.path, "/home");
  assert.equal(parseNuangAppLink("https://nuang.app/assessments")?.path, "/assessments");
  assert.equal(parseNuangAppLink("https://nuang.app/labs")?.path, "/labs");
  assert.equal(parseNuangAppLink("https://nuang.app/feed")?.path, "/feed");
  assert.equal(parseNuangAppLink("https://nuang.app/my")?.path, "/my");
  assert.equal(parseNuangAppLink("https://nuang.app/map")?.path, "/map");
});

test("rejects lookalike origins, credentials, cleartext, and unreviewed paths", () => {
  assert.equal(parseNuangAppLink("https://nuang.app.evil.example/share/x"), null);
  assert.equal(parseNuangAppLink("http://nuang.app/share/x"), null);
  assert.equal(parseNuangAppLink("https://user@nuang.app/share/x"), null);
  assert.equal(parseNuangAppLink("https://nuang.app/admin"), null);
  assert.equal(parseNuangAppLink("https://nuang.app/auth/callback?code=x"), null);
});

test("keeps the future mobile OAuth callback separate from normal navigation", () => {
  assert.equal(
    isMobileOAuthCallback("https://nuang.app/mobile/auth/callback?code=safe"),
    true,
  );
  assert.deepEqual(
    parseMobileOAuthCallback(
      "https://nuang.app/mobile/auth/callback?code=one-time-code",
    ),
    { code: "one-time-code", status: "code" },
  );
  assert.equal(
    parseNuangAppLink("https://nuang.app/mobile/auth/callback?code=safe"),
    null,
  );
  assert.equal(
    isMobileOAuthCallback("https://attacker.example/mobile/auth/callback"),
    false,
  );
  assert.equal(
    parseMobileOAuthCallback(
      "https://nuang.app/mobile/auth/callback?code=x&error=confused",
    ),
    null,
  );
});

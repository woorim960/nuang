import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryStorage } from "../src/secure-session-storage.js";
import { createMobileAuth, normalizeReturnPath } from "../src/mobile-auth.js";

const validConsent = {
  analytics: false,
  is14OrOlder: true,
  marketing: false,
  privacy: true,
  terms: true,
};

test("starts reviewed OAuth providers with PKCE callback and a safe return path", async () => {
  const opened = [];
  const signInRequests = [];
  const auth = createMobileAuth({
    browser: {
      async close() {},
      async open(options) {
        opened.push(options);
      },
    },
    clock: () => 1_000,
    storage: createMemoryStorage(),
    supabase: {
      auth: {
        async signInWithOAuth(request) {
          signInRequests.push(request);
          return {
            data: { url: "https://accounts.example/authorize" },
            error: null,
          };
        },
      },
    },
  });

  assert.deepEqual(
    await auth.startOAuth("google", "/results/local/result-1", validConsent),
    {
      ok: true,
    },
  );
  assert.deepEqual(signInRequests, [
    {
      options: {
        redirectTo: "https://nuang.app/mobile/auth/callback",
        skipBrowserRedirect: true,
      },
      provider: "google",
    },
  ]);
  assert.deepEqual(opened, [
    {
      presentationStyle: "popover",
      url: "https://accounts.example/authorize",
    },
  ]);
});

test("exchanges a callback only when an unexpired local intent exists", async () => {
  const storage = createMemoryStorage();
  let exchangedCode = null;
  const auth = createMobileAuth({
    browser: { async close() {}, async open() {} },
    clock: () => 2_000,
    async finalizeAccount({ consent, provider }) {
      assert.deepEqual(
        { consent, provider },
        {
          consent: validConsent,
          provider: "google",
        },
      );
      return { data: { accountId: "account-1" }, ok: true };
    },
    storage,
    supabase: {
      auth: {
        async exchangeCodeForSession(code) {
          exchangedCode = code;
          return {
            data: {
              session: { user: { id: "account-1" } },
              user: { id: "account-1" },
            },
            error: null,
          };
        },
        async signInWithOAuth() {
          return {
            data: { url: "https://accounts.example/authorize" },
            error: null,
          };
        },
      },
    },
  });

  await auth.startOAuth("google", "/my/reports/history", validConsent);
  assert.deepEqual(await auth.completeOAuth("one-time-code"), {
    accountId: "account-1",
    ok: true,
    returnPath: "/my/reports/history",
  });
  assert.equal(exchangedCode, "one-time-code");
  assert.deepEqual(await auth.completeOAuth("replayed-code"), {
    error: "missing_intent",
    ok: false,
  });
});

test("fails closed for unsupported providers, unsafe paths, and unsolicited callbacks", async () => {
  const auth = createMobileAuth({
    browser: { async close() {}, async open() {} },
    storage: createMemoryStorage(),
    supabase: { auth: {} },
  });

  assert.deepEqual(await auth.startOAuth("github"), {
    error: "provider_not_allowed",
    ok: false,
  });
  assert.deepEqual(await auth.startOAuth("apple"), {
    error: "provider_not_allowed",
    ok: false,
  });
  assert.deepEqual(await auth.startOAuth("google", "//attacker.example"), {
    error: "return_path_not_allowed",
    ok: false,
  });
  assert.deepEqual(await auth.completeOAuth("injected"), {
    error: "missing_intent",
    ok: false,
  });
});

test("accepts only reviewed in-app destinations", () => {
  assert.equal(normalizeReturnPath("/home"), "/home");
  assert.equal(normalizeReturnPath("/assessments"), "/assessments");
  assert.equal(normalizeReturnPath("/feed"), "/feed");
  assert.equal(normalizeReturnPath("/labs"), "/labs");
  assert.equal(normalizeReturnPath("/map"), "/map");
  assert.equal(normalizeReturnPath("/my"), "/my");
  assert.equal(
    normalizeReturnPath("/share/g1.token?from=kakao"),
    "/share/g1.token?from=kakao",
  );
  assert.equal(normalizeReturnPath("/admin"), null);
  assert.equal(normalizeReturnPath("https://attacker.example/home"), null);
});

test("coalesces duplicate native callbacks into one code exchange", async () => {
  const storage = createMemoryStorage();
  let exchangeCount = 0;
  let releaseExchange;
  let markExchangeStarted;
  const exchangeStarted = new Promise((resolve) => {
    markExchangeStarted = resolve;
  });
  const auth = createMobileAuth({
    browser: { async close() {}, async open() {} },
    async finalizeAccount() {
      return { data: { accountId: "account-1" }, ok: true };
    },
    storage,
    supabase: {
      auth: {
        async exchangeCodeForSession() {
          exchangeCount += 1;
          markExchangeStarted();
          await new Promise((resolve) => {
            releaseExchange = resolve;
          });
          return {
            data: { session: { user: { id: "account-1" } } },
            error: null,
          };
        },
        async signInWithOAuth() {
          return {
            data: { url: "https://accounts.example/authorize" },
            error: null,
          };
        },
      },
    },
  });

  await auth.startOAuth("google", "/home", validConsent);
  const first = auth.completeOAuth("same-code");
  const second = auth.completeOAuth("same-code");
  const conflicting = auth.completeOAuth("different-code");
  await exchangeStarted;
  assert.equal(exchangeCount, 1);
  assert.deepEqual(await conflicting, { error: "oauth_busy", ok: false });
  assert.deepEqual(await auth.startOAuth("kakao", "/home", validConsent), {
    error: "oauth_busy",
    ok: false,
  });
  assert.deepEqual(await auth.cancelOAuth(), {
    error: "oauth_busy",
    ok: false,
  });
  releaseExchange();
  assert.deepEqual(await Promise.all([first, second]), [
    { accountId: "account-1", ok: true, returnPath: "/home" },
    { accountId: "account-1", ok: true, returnPath: "/home" },
  ]);
});

test("clears callback busy state after an exchange throws", async () => {
  const storage = createMemoryStorage();
  let exchangeCount = 0;
  const auth = createMobileAuth({
    browser: { async close() {}, async open() {} },
    async finalizeAccount() {
      return { data: { accountId: "account-1" }, ok: true };
    },
    storage,
    supabase: {
      auth: {
        async exchangeCodeForSession() {
          exchangeCount += 1;
          if (exchangeCount === 1) throw new Error("native bridge failed");
          return {
            data: { session: { user: { id: "account-1" } } },
            error: null,
          };
        },
        async signInWithOAuth() {
          return {
            data: { url: "https://accounts.example/authorize" },
            error: null,
          };
        },
      },
    },
  });

  await auth.startOAuth("google", "/home", validConsent);
  assert.deepEqual(await auth.completeOAuth("first-code"), {
    error: "oauth_completion_failed",
    ok: false,
  });

  await auth.startOAuth("google", "/home", validConsent);
  assert.deepEqual(await auth.completeOAuth("second-code"), {
    accountId: "account-1",
    ok: true,
    returnPath: "/home",
  });
  assert.equal(exchangeCount, 2);
});

test("normalizes OAuth lifecycle throws without staying busy", async () => {
  const memory = createMemoryStorage();
  let failSet = true;
  let failRemove = false;
  let failClear = true;
  let failSignIn = true;
  let failSignOut = true;
  const storage = {
    async clear() {
      if (failClear) {
        failClear = false;
        throw new Error("Keychain unavailable");
      }
      return memory.clear();
    },
    getItem: (key) => memory.getItem(key),
    async removeItem(key) {
      if (failRemove) {
        failRemove = false;
        throw new Error("Keychain unavailable");
      }
      return memory.removeItem(key);
    },
    async setItem(key, value) {
      if (failSet) {
        failSet = false;
        throw new Error("Keychain unavailable");
      }
      return memory.setItem(key, value);
    },
  };
  const auth = createMobileAuth({
    browser: { async close() {}, async open() {} },
    storage,
    supabase: {
      auth: {
        async signInWithOAuth() {
          if (failSignIn) {
            failSignIn = false;
            throw new Error("Supabase bridge unavailable");
          }
          return {
            data: { url: "https://accounts.example/authorize" },
            error: null,
          };
        },
        async signOut() {
          if (failSignOut) {
            failSignOut = false;
            throw new Error("Supabase bridge unavailable");
          }
          return { error: null };
        },
      },
    },
  });

  assert.deepEqual(await auth.startOAuth("google", "/home", validConsent), {
    error: "oauth_start_failed",
    ok: false,
  });
  assert.deepEqual(await auth.startOAuth("google", "/home", validConsent), {
    error: "oauth_start_failed",
    ok: false,
  });
  assert.deepEqual(await auth.startOAuth("google", "/home", validConsent), {
    ok: true,
  });
  failRemove = true;
  assert.deepEqual(await auth.cancelOAuth(), {
    error: "oauth_cancel_failed",
    ok: false,
  });
  assert.deepEqual(await auth.cancelOAuth(), { error: "cancelled", ok: false });

  assert.deepEqual(await auth.signOut(), {
    error: "sign_out_failed",
    ok: false,
  });
  assert.deepEqual(await auth.signOut(), {
    error: "sign_out_failed",
    ok: false,
  });
  assert.deepEqual(await auth.signOut(), { ok: true });
});

test("rejects an expired OAuth intent without exchanging its code", async () => {
  const storage = createMemoryStorage();
  let exchangeCount = 0;
  let now = 1_000;
  const auth = createMobileAuth({
    browser: { async close() {}, async open() {} },
    clock: () => now,
    storage,
    supabase: {
      auth: {
        async exchangeCodeForSession() {
          exchangeCount += 1;
          return { data: { session: {} }, error: null };
        },
        async signInWithOAuth() {
          return {
            data: { url: "https://accounts.example/authorize" },
            error: null,
          };
        },
      },
    },
  });

  await auth.startOAuth("kakao", "/home", validConsent);
  now += 10 * 60 * 1000 + 1;
  assert.deepEqual(await auth.completeOAuth("expired-code"), {
    error: "missing_intent",
    ok: false,
  });
  assert.equal(exchangeCount, 0);
});

test("clears the new session when mandatory server account setup fails", async () => {
  const storage = createMemoryStorage();
  let signOutCount = 0;
  const auth = createMobileAuth({
    browser: { async close() {}, async open() {} },
    async finalizeAccount() {
      return { error: "consent_write_failed", ok: false };
    },
    storage,
    supabase: {
      auth: {
        async exchangeCodeForSession() {
          return { data: { session: { user: { id: "user-1" } } }, error: null };
        },
        async signInWithOAuth() {
          return {
            data: { url: "https://accounts.example/authorize" },
            error: null,
          };
        },
        async signOut() {
          signOutCount += 1;
          return { error: null };
        },
      },
    },
  });

  await auth.startOAuth("kakao", "/home", validConsent);
  assert.deepEqual(await auth.completeOAuth("one-time-code"), {
    error: "account_setup_failed",
    ok: false,
  });
  assert.equal(signOutCount, 1);
});

test("requires all mandatory consent fields before opening a provider", async () => {
  let openCount = 0;
  const auth = createMobileAuth({
    browser: {
      async close() {},
      async open() {
        openCount += 1;
      },
    },
    storage: createMemoryStorage(),
    supabase: { auth: {} },
  });

  assert.deepEqual(
    await auth.startOAuth("google", "/home", {
      ...validConsent,
      is14OrOlder: false,
    }),
    { error: "consent_required", ok: false },
  );
  assert.equal(openCount, 0);
});

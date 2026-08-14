import assert from "node:assert/strict";
import test from "node:test";
import {
  createMobileApiClient,
  normalizeApiUrl,
} from "../src/mobile-api-client.js";

test("sends a reviewed native API request with the current Bearer session", async () => {
  const requests = [];
  const client = createMobileApiClient({
    http: {
      async request(options) {
        requests.push(options);
        return {
          data: { authUserId: "auth-user-a", results: [] },
          status: 200,
        };
      },
    },
    supabase: createSupabase("access-token-1"),
  });

  assert.deepEqual(await client.request("/api/account-results?limit=10"), {
    data: { authUserId: "auth-user-a", results: [] },
    ok: true,
    status: 200,
  });
  assert.equal(
    requests[0].url,
    "https://nuang.app/api/account-results?limit=10",
  );
  assert.equal(requests[0].headers.Authorization, "Bearer access-token-1");
  assert.equal(requests[0].headers["X-Nuang-Auth-User-Id"], "auth-user-a");
  assert.equal(requests[0].headers["X-Nuang-Client"], "app.nuang.mobile");
  assert.equal(requests[0].disableRedirects, true);
});

test("discards account results when the authenticated user changes in flight", async () => {
  let userId = "auth-user-a";
  const client = createMobileApiClient({
    http: {
      async request() {
        userId = "auth-user-b";
        return {
          data: { authUserId: "auth-user-a", results: [{ id: "result-a" }] },
          status: 200,
        };
      },
    },
    supabase: {
      auth: {
        async getSession() {
          return {
            data: {
              session: {
                access_token: `token-${userId}`,
                user: { id: userId },
              },
            },
            error: null,
          };
        },
        async refreshSession() {
          return { data: { session: null }, error: null };
        },
      },
    },
  });

  assert.deepEqual(await client.request("/api/account-results"), {
    data: null,
    error: "conflict",
    ok: false,
    status: 409,
  });
});

test("retries one 401 only after Supabase returns a different refreshed token", async () => {
  const tokens = [];
  const client = createMobileApiClient({
    http: {
      async request(options) {
        tokens.push(options.headers.Authorization);
        return tokens.length === 1
          ? { data: null, status: 401 }
          : { data: { ok: true }, status: 200 };
      },
    },
    supabase: {
      auth: {
        async getSession() {
          return {
            data: { session: { access_token: "expired-token" } },
            error: null,
          };
        },
        async refreshSession() {
          return {
            data: { session: { access_token: "fresh-token" } },
            error: null,
          };
        },
      },
    },
  });

  assert.equal((await client.request("/api/me/profile")).ok, true);
  assert.deepEqual(tokens, ["Bearer expired-token", "Bearer fresh-token"]);
});

test("never sends authenticated calls without a secure Supabase session", async () => {
  let requestCount = 0;
  const client = createMobileApiClient({
    http: {
      async request() {
        requestCount += 1;
      },
    },
    supabase: createSupabase(null),
  });

  assert.deepEqual(await client.request("/api/me/profile"), {
    error: "unauthenticated",
    ok: false,
    status: 401,
  });
  assert.equal(requestCount, 0);
});

test("allows explicit public requests but rejects unreviewed or external paths", async () => {
  const requests = [];
  const client = createMobileApiClient({
    http: {
      async request(options) {
        requests.push(options);
        return { data: { ok: true }, status: 201 };
      },
    },
    supabase: createSupabase(null),
  });

  assert.equal(
    (
      await client.request("/api/guest-report-share-links", {
        authenticated: false,
        data: { report: "public" },
        method: "POST",
      })
    ).ok,
    true,
  );
  assert.equal(requests[0].headers.Authorization, undefined);
  assert.equal(normalizeApiUrl("/api/admin/members"), null);
  assert.equal(
    normalizeApiUrl("https://attacker.example/api/me/profile"),
    null,
  );
  assert.equal(normalizeApiUrl("//attacker.example/api/me/profile"), null);
  assert.equal(normalizeApiUrl("/api/me/profile#secret"), null);
  assert.equal(
    normalizeApiUrl("/api/assessment-quality-observations-evil"),
    null,
  );
  assert.equal(
    normalizeApiUrl("/api/assessment-quality-observations"),
    "https://nuang.app/api/assessment-quality-observations",
  );
});

function createSupabase(accessToken, userId = "auth-user-a") {
  return {
    auth: {
      async getSession() {
        return {
          data: {
            session: accessToken
              ? { access_token: accessToken, user: { id: userId } }
              : null,
          },
          error: null,
        };
      },
      async refreshSession() {
        return { data: { session: null }, error: null };
      },
    },
  };
}

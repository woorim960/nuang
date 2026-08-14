import assert from "node:assert/strict";
import test from "node:test";
import {
  parsePublicSupabaseKey,
  parseReviewedSupabaseUrl,
  validateMobileSupabaseEnvironment,
} from "../lib/mobile-environment.mjs";

const projectRef = "xkhulgpefeupfyugbpnf";
const projectUrl = `https://${projectRef}.supabase.co`;

test("accepts only a credential-free Supabase project URL", () => {
  assert.deepEqual(parseReviewedSupabaseUrl(projectUrl), {
    projectRef,
    url: `${projectUrl}/`,
  });
  assert.equal(parseReviewedSupabaseUrl("https://api.example.com"), null);
  assert.equal(
    parseReviewedSupabaseUrl(`https://user:password@${projectRef}.supabase.co`),
    null,
  );
  assert.equal(
    parseReviewedSupabaseUrl(`${projectUrl}/rest/v1?apikey=secret`),
    null,
  );
});

test("accepts publishable keys and matching legacy anon JWTs", () => {
  assert.deepEqual(
    parsePublicSupabaseKey(`sb_publishable_${"a".repeat(22)}_${"b".repeat(8)}`),
    { kind: "publishable" },
  );
  assert.deepEqual(
    parsePublicSupabaseKey(
      jwt({ iss: "supabase", ref: projectRef, role: "anon" }),
    ),
    {
      kind: "legacy_anon",
      projectRef,
    },
  );
  assert.deepEqual(
    validateMobileSupabaseEnvironment({
      anonKey: jwt({ iss: "supabase", ref: projectRef, role: "anon" }),
      url: projectUrl,
    }),
    [],
  );
});

test("rejects secret, service-role, malformed, and cross-project keys", () => {
  for (const key of [
    `sb_secret_${"a".repeat(22)}_${"b".repeat(8)}`,
    `sb_publishable_${"a".repeat(31)}`,
    "service_role",
    "arbitrary-public-looking-value",
    jwt({ iss: "supabase", ref: projectRef, role: "service_role" }),
    jwt({ ref: projectRef, role: "anon" }),
    jwt({ iss: "supabase", role: "anon" }),
  ]) {
    assert.equal(parsePublicSupabaseKey(key), null);
  }

  assert.deepEqual(
    validateMobileSupabaseEnvironment({
      anonKey: jwt({
        iss: "supabase",
        ref: "aaaaaaaaaaaaaaaaaaaa",
        role: "anon",
      }),
      url: projectUrl,
    }),
    [
      "NEXT_PUBLIC_SUPABASE_ANON_KEY belongs to a different Supabase project URL",
    ],
  );
});

function jwt(payload) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

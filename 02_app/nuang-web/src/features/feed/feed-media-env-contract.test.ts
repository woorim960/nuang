import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";

const fixtureDirectory = mkdtempSync(
  resolve(tmpdir(), "nuang-feed-media-env-"),
);
const checkerPath = resolve(process.cwd(), "scripts/check-env.mjs");
const clearedFeedMediaEnvironment = Object.fromEntries(
  [
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_ACCOUNT_ID",
    "CLOUDFLARE_R2_ANALYTICS_API_TOKEN",
    "CLOUDFLARE_R2_BUCKET_NAME",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "FEED_MEDIA_CLEANUP_SECRET",
    "FEED_MEDIA_R2_DELIVERY_ORIGIN",
    "FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET",
    "FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET_PREVIOUS",
    "FEED_MEDIA_R2_ENABLED",
    "FEED_MEDIA_R2_ALL_CUSTOMERS",
    "FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED",
    "FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED",
    "FEED_MEDIA_R2_CANARY_ACCOUNT_IDS",
    "FEED_MEDIA_R2_MAX_MANAGED_BYTES",
    "FEED_MEDIA_R2_REQUEST_TIMEOUT_MS",
    "FEED_MEDIA_WRITE_PROVIDER",
  ].map((key) => [key, ""]),
);
const requiredServerEnvironment = {
  CRON_SECRET: "cron_12345678901234567890123456789012",
  DATABASE_URL: "postgresql://example.invalid/nuang",
  FIELD_ENCRYPTION_KEY: "test-field-encryption-key",
  LEGAL_OPERATOR_NAME: "뉴앙",
  NEXT_PUBLIC_APP_ORIGIN: "https://nuang.app",
  NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY: "test-kakao-key",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  PRIVACY_CONTACT_EMAIL: "privacy@nuang.app",
  SHARE_TOKEN_PEPPER: "test-share-token-pepper",
  SUPABASE_DATA_REGION: "ap-northeast-2",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
};
const completeR2Environment = {
  CLOUDFLARE_R2_ACCESS_KEY_ID: "R2ACCESSKEY0123456789ABCDEF",
  CLOUDFLARE_R2_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_R2_ANALYTICS_API_TOKEN:
    "analytics-read-token-distinct-from-storage-secrets",
  CLOUDFLARE_R2_BUCKET_NAME: "nuang-feed-media",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "s".repeat(48),
  FEED_MEDIA_CLEANUP_SECRET: "c".repeat(48),
  FEED_MEDIA_R2_ALL_CUSTOMERS: "false",
  FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED: "false",
  FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED: "true",
  FEED_MEDIA_R2_CANARY_ACCOUNT_IDS: "019fff4b-285d-7111-9c6c-48ced670a41b",
  FEED_MEDIA_R2_DELIVERY_ORIGIN: "https://media.nuang.app",
  FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET: "h".repeat(48),
  FEED_MEDIA_R2_ENABLED: "true",
  FEED_MEDIA_R2_MAX_MANAGED_BYTES: "8000000000",
  FEED_MEDIA_R2_REQUEST_TIMEOUT_MS: "5000",
  FEED_MEDIA_WRITE_PROVIDER: "cloudflare_r2",
};

afterAll(() => {
  rmSync(fixtureDirectory, { force: true, recursive: true });
});

describe("feed media environment contract", () => {
  it("keeps the Supabase default valid without any R2 credentials", () => {
    const result = runEnvironmentCheck({
      FEED_MEDIA_R2_ENABLED: "false",
      FEED_MEDIA_WRITE_PROVIDER: "supabase",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("env check passed");
  });

  it("fails closed when the daily cleanup cron secret is shorter than 32 characters", () => {
    const result = runEnvironmentCheck({ CRON_SECRET: "too-short" });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "CRON_SECRET length",
    );
  });

  it("requires the cleanup cron secret during the Supabase-only phase", () => {
    const result = runEnvironmentCheck({ CRON_SECRET: "" });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("missing required: CRON_SECRET");
  });

  it("fails closed for a partial R2 configuration without printing values", () => {
    const sensitiveValue = "a".repeat(32);
    const result = runEnvironmentCheck({
      CLOUDFLARE_R2_ACCOUNT_ID: sensitiveValue,
      FEED_MEDIA_R2_ENABLED: "true",
      FEED_MEDIA_WRITE_PROVIDER: "cloudflare_r2",
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "invalid feed media configuration",
    );
    expect(`${result.stdout}\n${result.stderr}`).not.toContain(sensitiveValue);
  });

  it("fails closed for malformed R2 canary rollout settings", () => {
    const malformedAccountId = "not-a-customer-uuid";
    const result = runEnvironmentCheck({
      FEED_MEDIA_R2_ALL_CUSTOMERS: "yes",
      FEED_MEDIA_R2_CANARY_ACCOUNT_IDS: malformedAccountId,
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "FEED_MEDIA_R2_ALL_CUSTOMERS",
    );
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "FEED_MEDIA_R2_CANARY_ACCOUNT_IDS format",
    );
    expect(`${result.stdout}\n${result.stderr}`).not.toContain(
      malformedAccountId,
    );
  });

  it("accepts a complete bounded R2 server configuration", () => {
    const result = runEnvironmentCheck(completeR2Environment);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("env check passed");
  });

  it("requires the exact production delivery origin and a plausible access key", () => {
    const result = runEnvironmentCheck({
      ...completeR2Environment,
      CLOUDFLARE_R2_ACCESS_KEY_ID: "short-key",
      FEED_MEDIA_R2_DELIVERY_ORIGIN: "https://media-preview.nuang.app",
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "CLOUDFLARE_R2_ACCESS_KEY_ID format",
    );
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "FEED_MEDIA_R2_DELIVERY_ORIGIN production origin",
    );
  });

  it("keeps storage, delivery, previous delivery, and analytics secrets distinct", () => {
    const repeatedSecret = "do-not-print-this-shared-r2-secret-value";
    const result = runEnvironmentCheck({
      ...completeR2Environment,
      CLOUDFLARE_R2_ANALYTICS_API_TOKEN: repeatedSecret,
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: repeatedSecret,
      FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET: repeatedSecret,
      FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET_PREVIOUS: repeatedSecret,
    });
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toContain("R2 signing secret must differ from R2 secret");
    expect(output).toContain(
      "R2 current and previous signing secrets must differ",
    );
    expect(output).toContain(
      "R2 analytics token must differ from storage secrets",
    );
    expect(output).not.toContain(repeatedSecret);
  });

  it("requires a separate explicit approval before all-customer routing", () => {
    const unapproved = runEnvironmentCheck({
      ...completeR2Environment,
      FEED_MEDIA_R2_ALL_CUSTOMERS: "true",
    });
    expect(unapproved.status).toBe(1);
    expect(`${unapproved.stdout}\n${unapproved.stderr}`).toContain(
      "R2 all-customer rollout requires explicit approval",
    );

    const approved = runEnvironmentCheck({
      ...completeR2Environment,
      FEED_MEDIA_R2_ALL_CUSTOMERS: "true",
      FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED: "true",
    });
    expect(approved.status).toBe(0);
    expect(approved.stdout).toContain("env check passed");
  });

  it("requires a completed privacy review before selecting R2 for writes", () => {
    const result = runEnvironmentCheck({
      ...completeR2Environment,
      FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED: "false",
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "R2 write provider requires completed privacy review",
    );
  });

  it("requires the read-only analytics token whenever R2 is enabled", () => {
    const result = runEnvironmentCheck({
      ...completeR2Environment,
      CLOUDFLARE_R2_ANALYTICS_API_TOKEN: "",
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "CLOUDFLARE_R2_ANALYTICS_API_TOKEN",
    );
  });
});

function runEnvironmentCheck(extraEnvironment: Record<string, string>) {
  return spawnSync(process.execPath, [checkerPath, "server"], {
    cwd: fixtureDirectory,
    encoding: "utf8",
    env: {
      ...process.env,
      ...requiredServerEnvironment,
      ...clearedFeedMediaEnvironment,
      ...extraEnvironment,
    },
  });
}

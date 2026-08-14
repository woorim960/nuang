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
    "CLOUDFLARE_R2_BUCKET_NAME",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "FEED_MEDIA_CLEANUP_SECRET",
    "FEED_MEDIA_R2_DELIVERY_ORIGIN",
    "FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET",
    "FEED_MEDIA_R2_ENABLED",
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

  it("accepts a complete bounded R2 server configuration", () => {
    const result = runEnvironmentCheck({
      CLOUDFLARE_R2_ACCESS_KEY_ID: "test-access-key",
      CLOUDFLARE_R2_ACCOUNT_ID: "a".repeat(32),
      CLOUDFLARE_R2_BUCKET_NAME: "nuang-feed-media",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "s".repeat(48),
      FEED_MEDIA_CLEANUP_SECRET: "c".repeat(48),
      FEED_MEDIA_R2_DELIVERY_ORIGIN: "https://media.nuang.app",
      FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET: "h".repeat(48),
      FEED_MEDIA_R2_ENABLED: "true",
      FEED_MEDIA_R2_MAX_MANAGED_BYTES: "8000000000",
      FEED_MEDIA_R2_REQUEST_TIMEOUT_MS: "5000",
      FEED_MEDIA_WRITE_PROVIDER: "cloudflare_r2",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("env check passed");
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

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const mode = process.argv[2] ?? "local";
const env = {
  ...process.env,
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
};

const requiredByMode = {
  local: [],
  auth: [
    "NEXT_PUBLIC_APP_ORIGIN",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ],
  server: [
    "NEXT_PUBLIC_APP_ORIGIN",
    "NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "SHARE_TOKEN_PEPPER",
    "FIELD_ENCRYPTION_KEY",
    "LEGAL_OPERATOR_NAME",
    "PRIVACY_CONTACT_EMAIL",
    "SUPABASE_DATA_REGION",
    "CRON_SECRET",
  ],
};

const optionalByMode = {
  local: ["NEXT_PUBLIC_APP_ORIGIN", "NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY"],
  auth: [
    "NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY",
    "NAVER_OAUTH_CLIENT_ID",
    "NAVER_OAUTH_CLIENT_SECRET",
  ],
  server: [
    "NAVER_OAUTH_CLIENT_ID",
    "NAVER_OAUTH_CLIENT_SECRET",
    "ADMIN_BOOTSTRAP_EMAILS",
    "RESEND_API_KEY",
    "EMAIL_VERIFICATION_FROM",
    "AD_INQUIRY_NOTIFICATION_EMAILS",
    "AD_INQUIRY_FROM",
    "AD_CONTACT_HASH_PEPPER",
    "AD_EVENT_SESSION_PEPPER",
    "AD_OUTBOX_CRON_SECRET",
    "AD_RESEND_WEBHOOK_SECRET",
    "MARKETING_EMAIL_SEND_ENABLED",
    "MARKETING_EMAIL_FROM",
    "MARKETING_EMAIL_REPLY_TO",
    "MARKETING_CONTACT_EMAIL",
    "MARKETING_CONTACT_PHONE",
    "ADVERTISING_ENABLED",
    "ADSENSE_ENABLED",
    "ADSENSE_SITE_READY",
    "ADSENSE_PRIVACY_READY",
    "ADSENSE_CSP_REPORT_ONLY_READY",
    "ADSENSE_EEA_CMP_READY",
    "ADSENSE_PUBLISHER_ID",
    "ADSENSE_HOME_SLOT_ID",
    "COUPANG_PARTNERS_ENABLED",
    "COUPANG_POLICY_READY",
    "COUPANG_ALLOWED_DESTINATION_HOSTS",
    "COUPANG_ALLOWED_IMAGE_HOSTS",
    "GATE_C_REVIEW_EVENT_ENTRY_ENABLED",
    "FEED_MEDIA_CLEANUP_SECRET",
    "FEED_MEDIA_WRITE_PROVIDER",
    "FEED_MEDIA_R2_ENABLED",
    "FEED_MEDIA_R2_ALL_CUSTOMERS",
    "FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED",
    "FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED",
    "FEED_MEDIA_R2_CANARY_ACCOUNT_IDS",
    "CLOUDFLARE_R2_ACCOUNT_ID",
    "CLOUDFLARE_R2_BUCKET_NAME",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_ANALYTICS_API_TOKEN",
    "FEED_MEDIA_R2_DELIVERY_ORIGIN",
    "FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET",
    "FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET_PREVIOUS",
    "FEED_MEDIA_R2_REQUEST_TIMEOUT_MS",
    "FEED_MEDIA_R2_MAX_MANAGED_BYTES",
  ],
};

if (!Object.hasOwn(requiredByMode, mode)) {
  console.error(`Unknown env check mode: ${mode}`);
  console.error("Use one of: local, auth, server");
  process.exit(1);
}

const required = requiredByMode[mode];
const optional = optionalByMode[mode];
const missing = required.filter((key) => !nonEmpty(env[key]));
const present = required.filter((key) => nonEmpty(env[key]));
const optionalPresent = optional.filter((key) => nonEmpty(env[key]));
const optionalMissing = optional.filter((key) => !nonEmpty(env[key]));
const mediaConfigurationErrors =
  mode === "server" ? validateFeedMediaEnvironment(env) : [];

console.log(`NUANG env check: ${mode}`);

if (present.length > 0) {
  console.log(`present required: ${present.join(", ")}`);
}

if (missing.length > 0) {
  console.log(`missing required: ${missing.join(", ")}`);
}

if (optionalPresent.length > 0) {
  console.log(`present optional: ${optionalPresent.join(", ")}`);
}

if (optionalMissing.length > 0) {
  console.log(`missing optional: ${optionalMissing.join(", ")}`);
}

if (mode === "local") {
  console.log("local mode can run without Supabase or OAuth credentials.");
}

if (missing.length > 0) {
  process.exit(1);
}

if (mediaConfigurationErrors.length > 0) {
  console.error(
    `invalid feed media configuration: ${mediaConfigurationErrors.join(", ")}`,
  );
  process.exit(1);
}

console.log("env check passed.");

function readEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);

  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) return [line, ""];

        const key = line.slice(0, separatorIndex).trim();
        const value = stripQuotes(line.slice(separatorIndex + 1).trim());
        return [key, value];
      }),
  );
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateFeedMediaEnvironment(environment) {
  const errors = [];
  const writeProvider =
    environment.FEED_MEDIA_WRITE_PROVIDER?.trim() || "supabase";
  if (!["supabase", "cloudflare_r2"].includes(writeProvider)) {
    errors.push("FEED_MEDIA_WRITE_PROVIDER");
  }

  const enabled = environment.FEED_MEDIA_R2_ENABLED?.trim().toLowerCase();
  if (enabled && enabled !== "true" && enabled !== "false") {
    errors.push("FEED_MEDIA_R2_ENABLED");
  }

  const allCustomers =
    environment.FEED_MEDIA_R2_ALL_CUSTOMERS?.trim().toLowerCase();
  if (allCustomers && allCustomers !== "true" && allCustomers !== "false") {
    errors.push("FEED_MEDIA_R2_ALL_CUSTOMERS");
  }

  const allCustomersApproved =
    environment.FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED?.trim().toLowerCase();
  if (
    allCustomersApproved &&
    allCustomersApproved !== "true" &&
    allCustomersApproved !== "false"
  ) {
    errors.push("FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED");
  }
  if (allCustomers === "true" && allCustomersApproved !== "true") {
    errors.push("R2 all-customer rollout requires explicit approval");
  }

  const privacyReviewApproved =
    environment.FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED?.trim().toLowerCase();
  if (
    privacyReviewApproved &&
    privacyReviewApproved !== "true" &&
    privacyReviewApproved !== "false"
  ) {
    errors.push("FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED");
  }
  if (writeProvider === "cloudflare_r2" && privacyReviewApproved !== "true") {
    errors.push("R2 write provider requires completed privacy review");
  }

  const canaryAccountIds = environment.FEED_MEDIA_R2_CANARY_ACCOUNT_IDS?.trim();
  if (
    canaryAccountIds &&
    canaryAccountIds
      .split(",")
      .some(
        (accountId) =>
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            accountId.trim(),
          ),
      )
  ) {
    errors.push("FEED_MEDIA_R2_CANARY_ACCOUNT_IDS format");
  }

  const requiredR2Keys = [
    "CLOUDFLARE_R2_ACCOUNT_ID",
    "CLOUDFLARE_R2_BUCKET_NAME",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_ANALYTICS_API_TOKEN",
    "FEED_MEDIA_R2_DELIVERY_ORIGIN",
    "FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET",
  ];
  const configuredR2Keys = requiredR2Keys.filter((key) =>
    nonEmpty(environment[key]),
  );
  if (
    configuredR2Keys.length > 0 &&
    configuredR2Keys.length !== requiredR2Keys.length
  ) {
    errors.push("incomplete R2 credentials");
  }
  if (enabled === "true") {
    for (const key of requiredR2Keys) {
      if (!nonEmpty(environment[key])) errors.push(key);
    }
  }
  if (writeProvider === "cloudflare_r2" && enabled !== "true") {
    errors.push("R2 write provider requires FEED_MEDIA_R2_ENABLED=true");
  }

  if (enabled === "true" || configuredR2Keys.length > 0) {
    if (!/^[a-f0-9]{32}$/i.test(environment.CLOUDFLARE_R2_ACCOUNT_ID ?? "")) {
      errors.push("CLOUDFLARE_R2_ACCOUNT_ID format");
    }
    if (
      !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(
        environment.CLOUDFLARE_R2_BUCKET_NAME ?? "",
      )
    ) {
      errors.push("CLOUDFLARE_R2_BUCKET_NAME format");
    }
    if (
      !/^[A-Za-z0-9]{16,128}$/.test(
        environment.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() ?? "",
      )
    ) {
      errors.push("CLOUDFLARE_R2_ACCESS_KEY_ID format");
    }
    if (
      (environment.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim().length ?? 0) < 32
    ) {
      errors.push("CLOUDFLARE_R2_SECRET_ACCESS_KEY length");
    }
    if (
      (environment.FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET?.trim().length ?? 0) <
      32
    ) {
      errors.push("FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET length");
    }
    if (!isHttpsOrigin(environment.FEED_MEDIA_R2_DELIVERY_ORIGIN)) {
      errors.push("FEED_MEDIA_R2_DELIVERY_ORIGIN format");
    }
    if (
      isProductionAppOrigin(environment.NEXT_PUBLIC_APP_ORIGIN) &&
      environment.FEED_MEDIA_R2_DELIVERY_ORIGIN?.trim() !==
        "https://media.nuang.app"
    ) {
      errors.push("FEED_MEDIA_R2_DELIVERY_ORIGIN production origin");
    }
    const r2Secret = environment.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
    const signingSecret =
      environment.FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET?.trim();
    const previousSigningSecret =
      environment.FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET_PREVIOUS?.trim();
    const analyticsToken =
      environment.CLOUDFLARE_R2_ANALYTICS_API_TOKEN?.trim();
    if (r2Secret && signingSecret && r2Secret === signingSecret) {
      errors.push("R2 signing secret must differ from R2 secret");
    }
    if (
      r2Secret &&
      previousSigningSecret &&
      r2Secret === previousSigningSecret
    ) {
      errors.push("R2 previous signing secret must differ from R2 secret");
    }
    if (previousSigningSecret && previousSigningSecret.length < 32) {
      errors.push("FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET_PREVIOUS length");
    }
    if (
      previousSigningSecret &&
      signingSecret &&
      previousSigningSecret === signingSecret
    ) {
      errors.push("R2 current and previous signing secrets must differ");
    }
    if (
      analyticsToken &&
      ((r2Secret && analyticsToken === r2Secret) ||
        (signingSecret && analyticsToken === signingSecret) ||
        (previousSigningSecret && analyticsToken === previousSigningSecret))
    ) {
      errors.push("R2 analytics token must differ from storage secrets");
    }
    if (
      !isIntegerInRange(
        environment.FEED_MEDIA_R2_REQUEST_TIMEOUT_MS,
        250,
        30000,
      )
    ) {
      errors.push("FEED_MEDIA_R2_REQUEST_TIMEOUT_MS range");
    }
    if (
      !isIntegerInRange(
        environment.FEED_MEDIA_R2_MAX_MANAGED_BYTES,
        1_000_000_000,
        9_500_000_000,
      )
    ) {
      errors.push("FEED_MEDIA_R2_MAX_MANAGED_BYTES range");
    }
  }
  if (
    nonEmpty(environment.FEED_MEDIA_CLEANUP_SECRET) &&
    environment.FEED_MEDIA_CLEANUP_SECRET.trim().length < 32
  ) {
    errors.push("FEED_MEDIA_CLEANUP_SECRET length");
  }
  if (
    nonEmpty(environment.CRON_SECRET) &&
    environment.CRON_SECRET.trim().length < 32
  ) {
    errors.push("CRON_SECRET length");
  }
  return Array.from(new Set(errors));
}

function isHttpsOrigin(value) {
  if (!nonEmpty(value)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function isProductionAppOrigin(value) {
  if (!nonEmpty(value)) return false;
  try {
    return new URL(value).origin === "https://nuang.app";
  } catch {
    return false;
  }
}

function isIntegerInRange(value, minimum, maximum) {
  if (!nonEmpty(value)) return true;
  const text = value.trim();
  if (!/^\d+$/.test(text)) return false;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum;
}

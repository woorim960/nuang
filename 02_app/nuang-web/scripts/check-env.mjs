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
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "SHARE_TOKEN_PEPPER",
    "FIELD_ENCRYPTION_KEY",
  ],
};

const optionalByMode = {
  local: ["NEXT_PUBLIC_APP_ORIGIN"],
  auth: ["NAVER_OAUTH_CLIENT_ID", "NAVER_OAUTH_CLIENT_SECRET"],
  server: [
    "NAVER_OAUTH_CLIENT_ID",
    "NAVER_OAUTH_CLIENT_SECRET",
    "ADMIN_BOOTSTRAP_EMAILS",
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

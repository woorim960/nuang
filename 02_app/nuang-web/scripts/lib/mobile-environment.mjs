import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadMobileEnvironment(root, environment = process.env) {
  return {
    ...readEnvFile(resolve(root, ".env")),
    ...readEnvFile(resolve(root, ".env.local")),
    ...environment,
  };
}

export function validateMobileSupabaseEnvironment({ anonKey, url }) {
  const failures = [];
  const reviewedUrl = parseReviewedSupabaseUrl(url);

  if (!reviewedUrl) {
    failures.push(
      "NEXT_PUBLIC_SUPABASE_URL must be a credential-free HTTPS project URL on supabase.co",
    );
  }

  const key = parsePublicSupabaseKey(anonKey);
  if (!key) {
    failures.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY must be a Supabase publishable key or a legacy JWT with role=anon",
    );
  } else if (
    reviewedUrl &&
    key.kind === "legacy_anon" &&
    typeof key.projectRef === "string" &&
    key.projectRef !== reviewedUrl.projectRef
  ) {
    failures.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY belongs to a different Supabase project URL",
    );
  }

  return failures;
}

export function parseReviewedSupabaseUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    const match = /^([a-z0-9]{20})\.supabase\.co$/u.exec(url.hostname);
    if (
      !match ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return { projectRef: match[1], url: url.toString() };
  } catch {
    return null;
  }
}

export function parsePublicSupabaseKey(value) {
  const key = String(value ?? "").trim();

  if (/^sb_publishable_[A-Za-z0-9_-]{22}_[A-Za-z0-9_-]{8}$/u.test(key)) {
    return { kind: "publishable" };
  }
  if (
    key.startsWith("sb_secret_") ||
    key.toLowerCase().includes("service_role")
  ) {
    return null;
  }

  const segments = key.split(".");
  if (segments.length !== 3 || segments.some((segment) => !segment)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(segments[1], "base64url").toString("utf8"),
    );
    if (
      payload?.iss !== "supabase" ||
      payload?.role !== "anon" ||
      typeof payload.ref !== "string"
    ) {
      return null;
    }
    return {
      kind: "legacy_anon",
      projectRef: payload.ref,
    };
  } catch {
    return null;
  }
}

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        if (index < 0) return [line, ""];
        return [
          line.slice(0, index).trim(),
          stripQuotes(line.slice(index + 1).trim()),
        ];
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

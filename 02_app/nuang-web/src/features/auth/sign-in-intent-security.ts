import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  isAllowedOAuthOrigin,
  safeSignInReturnPath,
  type SignInIntentPayload,
  type SignInIntentProvider,
  signInIntentTtlSeconds,
} from "@/features/auth/sign-in-intent-contract";

export function createSignInIntent({
  initiatingOrigin,
  now = Date.now(),
  provider,
  returnPath,
}: {
  initiatingOrigin: string;
  now?: number;
  provider: SignInIntentProvider;
  returnPath: string;
}) {
  if (!isAllowedOAuthOrigin(initiatingOrigin)) {
    throw new Error("OAuth initiating origin is not allowed");
  }
  const payload = {
    createdAt: now,
    expiresAt: now + signInIntentTtlSeconds * 1_000,
    initiatingOrigin,
    nonce: randomUUID(),
    provider,
    returnPath: safeSignInReturnPath(returnPath),
    version: 1,
  } satisfies SignInIntentPayload;
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    payload,
    token: `${encoded}.${signIntent(encoded)}`,
  };
}

export function verifySignInIntent({
  callbackOrigin,
  now = Date.now(),
  token,
}: {
  callbackOrigin: string;
  now?: number;
  token: string | null | undefined;
}) {
  if (!token || token.length > 2_000) {
    return { code: "intent_missing" as const, ok: false as const };
  }
  const [encoded, suppliedSignature, ...rest] = token.split(".");
  if (!encoded || !suppliedSignature || rest.length > 0) {
    return { code: "intent_invalid" as const, ok: false as const };
  }
  const expectedSignature = signIntent(encoded);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return { code: "intent_invalid" as const, ok: false as const };
  }

  try {
    const raw = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<SignInIntentPayload>;
    if (
      raw.version !== 1 ||
      typeof raw.nonce !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(raw.nonce) ||
      (raw.provider !== "google" && raw.provider !== "kakao") ||
      typeof raw.createdAt !== "number" ||
      typeof raw.expiresAt !== "number" ||
      raw.expiresAt - raw.createdAt !== signInIntentTtlSeconds * 1_000 ||
      typeof raw.initiatingOrigin !== "string" ||
      !isAllowedOAuthOrigin(raw.initiatingOrigin) ||
      typeof raw.returnPath !== "string" ||
      safeSignInReturnPath(raw.returnPath) !== raw.returnPath
    ) {
      return { code: "intent_invalid" as const, ok: false as const };
    }
    if (raw.expiresAt <= now || raw.createdAt > now + 30_000) {
      return { code: "intent_expired" as const, ok: false as const };
    }
    if (raw.initiatingOrigin !== callbackOrigin) {
      return { code: "origin_mismatch" as const, ok: false as const };
    }
    return { intent: raw as SignInIntentPayload, ok: true as const };
  } catch {
    return { code: "intent_invalid" as const, ok: false as const };
  }
}

function signIntent(encodedPayload: string) {
  return createHmac("sha256", readIntentPepper())
    .update(`nuang-sign-in-intent:${encodedPayload}`)
    .digest("base64url");
}

function readIntentPepper() {
  const pepper = process.env.SHARE_TOKEN_PEPPER?.trim();
  if (!pepper) throw new Error("SHARE_TOKEN_PEPPER is required");
  return pepper;
}

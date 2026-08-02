import "server-only";

import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

const intentSecretBytes = 32;

export function createIdentityLinkIntentSecret() {
  const id = randomUUID();
  const secret = randomBytes(intentSecretBytes).toString("base64url");
  return {
    id,
    nonceHash: hashIdentityLinkIntentNonce({ id, secret }),
    token: `${id}.${secret}`,
  };
}

export function parseIdentityLinkIntentToken(value: string | null) {
  if (!value || value.length > 160) return null;
  const [id, secret, ...rest] = value.split(".");
  if (
    rest.length > 0 ||
    !id ||
    !secret ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    !/^[A-Za-z0-9_-]{40,60}$/.test(secret)
  ) {
    return null;
  }

  return { id, nonceHash: hashIdentityLinkIntentNonce({ id, secret }) };
}

export function identityLinkNonceMatches({
  expectedHash,
  suppliedHash,
}: {
  expectedHash: string;
  suppliedHash: string;
}) {
  const expected = Buffer.from(expectedHash, "hex");
  const supplied = Buffer.from(suppliedHash, "hex");
  return (
    expected.length === supplied.length && timingSafeEqual(expected, supplied)
  );
}

function hashIdentityLinkIntentNonce({
  id,
  secret,
}: {
  id: string;
  secret: string;
}) {
  return createHmac("sha256", readIntentPepper())
    .update(`nuang-identity-link:${id}:${secret}`)
    .digest("hex");
}

function readIntentPepper() {
  const pepper = process.env.SHARE_TOKEN_PEPPER?.trim();
  if (!pepper) throw new Error("SHARE_TOKEN_PEPPER is required");
  return pepper;
}

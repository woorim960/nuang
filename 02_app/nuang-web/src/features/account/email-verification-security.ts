import "server-only";

import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

export function createEmailVerificationSecret() {
  return {
    challengeId: randomUUID(),
    code: randomInt(0, 1_000_000).toString().padStart(6, "0"),
  };
}

export function hashEmailVerificationCode({
  accountId,
  challengeId,
  code,
  emailHash,
}: {
  accountId: string;
  challengeId: string;
  code: string;
  emailHash: string;
}) {
  return createHmac("sha256", readVerificationPepper())
    .update(
      `nuang-email-verification:${challengeId}:${accountId}:${emailHash}:${code}`,
    )
    .digest("hex");
}

export function verifyEmailVerificationCode({
  accountId,
  challengeId,
  code,
  emailHash,
  expectedHash,
}: {
  accountId: string;
  challengeId: string;
  code: string;
  emailHash: string;
  expectedHash: string;
}) {
  const suppliedHash = hashEmailVerificationCode({
    accountId,
    challengeId,
    code,
    emailHash,
  });
  const supplied = Buffer.from(suppliedHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

function readVerificationPepper() {
  const pepper = process.env.SHARE_TOKEN_PEPPER?.trim();
  if (!pepper) throw new Error("SHARE_TOKEN_PEPPER is required");
  return pepper;
}

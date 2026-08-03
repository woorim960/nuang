import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

const payloadSchema = z.object({
  accountId: z.string().uuid(),
  issuedAt: z.string().datetime(),
  purpose: z.literal("marketing_email_unsubscribe"),
});
const TOKEN_VERSION = "v1";

export function createMarketingUnsubscribeToken(accountId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", readKey(), iv);
  cipher.setAAD(readAad());
  const encrypted = Buffer.concat([
    cipher.update(
      JSON.stringify({
        accountId,
        issuedAt: new Date().toISOString(),
        purpose: "marketing_email_unsubscribe",
      }),
      "utf8",
    ),
    cipher.final(),
  ]);

  return [
    TOKEN_VERSION,
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function readMarketingUnsubscribeToken(token: string) {
  try {
    const [version, encodedIv, encodedPayload, encodedTag, ...rest] =
      token.split(".");
    if (
      version !== TOKEN_VERSION ||
      !encodedIv ||
      !encodedPayload ||
      !encodedTag ||
      rest.length > 0 ||
      token.length > 1500
    ) {
      return null;
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      readKey(),
      Buffer.from(encodedIv, "base64url"),
    );
    decipher.setAAD(readAad());
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(encodedPayload, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = payloadSchema.safeParse(JSON.parse(plain));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function readAad() {
  return Buffer.from("nuang:marketing-email:unsubscribe:v1", "utf8");
}

function readKey() {
  const encoded = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("FIELD_ENCRYPTION_KEY is required");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be a 32-byte base64 key");
  }
  return key;
}

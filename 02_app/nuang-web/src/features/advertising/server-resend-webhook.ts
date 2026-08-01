import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export function verifyResendWebhookSignature({
  headers,
  now = Date.now(),
  rawBody,
}: {
  headers: Headers;
  now?: number;
  rawBody: string;
}) {
  const secret = process.env.AD_RESEND_WEBHOOK_SECRET?.trim();
  const messageId = headers.get("svix-id")?.trim();
  const timestamp = headers.get("svix-timestamp")?.trim();
  const signatures = headers.get("svix-signature")?.trim();
  if (!secret || !messageId || !timestamp || !signatures) return false;

  const timestampSeconds = Number(timestamp);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Math.floor(now / 1000) - timestampSeconds) >
      WEBHOOK_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const encodedSecret = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret;
  let key: Buffer;
  try {
    key = Buffer.from(encodedSecret, "base64");
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const expected = createHmac("sha256", key)
    .update(`${messageId}.${timestamp}.${rawBody}`)
    .digest();

  return signatures.split(" ").some((signature) => {
    const [version, encodedSignature] = signature.split(",", 2);
    if (version !== "v1" || !encodedSignature) return false;
    try {
      const received = Buffer.from(encodedSignature, "base64");
      return (
        received.length === expected.length &&
        timingSafeEqual(received, expected)
      );
    } catch {
      return false;
    }
  });
}

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { z } from "zod";
import {
  reportShareContentSchema,
  type ReportShareContent,
} from "@/features/share/report-share-contract";

const GUEST_SHARE_TOKEN_PREFIX = "g1";
const GUEST_SHARE_LIFETIME_SECONDS = 60 * 60 * 24 * 180;
const MAX_TOKEN_LENGTH = 4_096;

const guestSharePayloadSchema = z.object({
  content: reportShareContentSchema,
  expiresAt: z.number().int().positive(),
  issuedAt: z.number().int().positive(),
  version: z.literal(1),
});

type GuestSharePayload = z.infer<typeof guestSharePayloadSchema>;

export type GuestReportShareTokenReadResult =
  | { content: ReportShareContent; status: "active" }
  | { status: "expired" | "invalid" | "not_guest" | "unavailable" };

export function createGuestReportShareToken(
  content: ReportShareContent,
  now = new Date(),
) {
  const pepper = readSharePepper();
  if (!pepper) return null;

  const issuedAt = Math.floor(now.getTime() / 1_000);
  const payload: GuestSharePayload = {
    content: reportShareContentSchema.parse(content),
    expiresAt: issuedAt + GUEST_SHARE_LIFETIME_SECONDS,
    issuedAt,
    version: 1,
  };
  const encodedPayload = deflateRawSync(
    Buffer.from(JSON.stringify(payload), "utf8"),
  ).toString("base64url");
  const signature = sign(encodedPayload, pepper);
  return `${GUEST_SHARE_TOKEN_PREFIX}.${encodedPayload}.${signature}`;
}

export function readGuestReportShareToken(
  token: string,
  now = new Date(),
): GuestReportShareTokenReadResult {
  if (!token.startsWith(`${GUEST_SHARE_TOKEN_PREFIX}.`)) {
    return { status: "not_guest" };
  }
  if (token.length > MAX_TOKEN_LENGTH) return { status: "invalid" };

  const pepper = readSharePepper();
  if (!pepper) return { status: "unavailable" };

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== GUEST_SHARE_TOKEN_PREFIX) {
    return { status: "invalid" };
  }
  const encodedPayload = parts[1];
  const providedSignature = parts[2];
  if (!encodedPayload || !providedSignature) return { status: "invalid" };

  const expectedSignature = sign(encodedPayload, pepper);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const providedBuffer = Buffer.from(providedSignature, "utf8");
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return { status: "invalid" };
  }

  try {
    const decoded = inflateRawSync(Buffer.from(encodedPayload, "base64url"), {
      maxOutputLength: 8_192,
    }).toString("utf8");
    const payload = guestSharePayloadSchema.parse(JSON.parse(decoded));
    if (payload.expiresAt <= Math.floor(now.getTime() / 1_000)) {
      return { status: "expired" };
    }
    return { content: payload.content, status: "active" };
  } catch {
    return { status: "invalid" };
  }
}

function readSharePepper() {
  return process.env.SHARE_TOKEN_PEPPER?.trim() || null;
}

function sign(payload: string, pepper: string) {
  return createHmac("sha256", pepper)
    .update(`nuang:guest-report-share:v1:${payload}`)
    .digest("base64url");
}

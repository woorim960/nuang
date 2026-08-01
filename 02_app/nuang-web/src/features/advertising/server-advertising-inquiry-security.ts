import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

const ENCRYPTION_VERSION = "v1";
const PUBLIC_REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export type AdvertisingInquiryProtectedField =
  | "contact_name"
  | "contact_email"
  | "contact_phone"
  | "details"
  | "outbox_recipient";

export function protectAdvertisingInquiryValue({
  field,
  inquiryId,
  value,
}: {
  field: AdvertisingInquiryProtectedField;
  inquiryId: string;
  value: string;
}) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    readEncryptionKey(),
    initializationVector,
  );
  cipher.setAAD(readAdditionalData(inquiryId, field));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return [
    ENCRYPTION_VERSION,
    initializationVector.toString("base64url"),
    encrypted.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function revealAdvertisingInquiryValue({
  ciphertext,
  field,
  inquiryId,
}: {
  ciphertext: string;
  field: AdvertisingInquiryProtectedField;
  inquiryId: string;
}) {
  const [version, encodedIv, encodedPayload, encodedTag, ...rest] =
    ciphertext.split(".");
  if (
    version !== ENCRYPTION_VERSION ||
    !encodedIv ||
    !encodedPayload ||
    !encodedTag ||
    rest.length > 0
  ) {
    throw new Error("Unknown advertising inquiry ciphertext");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    readEncryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAAD(readAdditionalData(inquiryId, field));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedPayload, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function normalizeAdvertisingEmail(value: string) {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  if (
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new Error("Invalid advertising inquiry email");
  }
  return normalized;
}

export function maskAdvertisingEmail(value: string) {
  const normalized = normalizeAdvertisingEmail(value);
  const separatorIndex = normalized.lastIndexOf("@");
  const local = normalized.slice(0, separatorIndex);
  const domain = normalized.slice(separatorIndex + 1);
  const visibleLocal =
    local.length <= 1
      ? "*"
      : local.length === 2
        ? `${local.slice(0, 1)}*`
        : `${local.slice(0, 2)}***`;
  return `${visibleLocal}@${domain}`;
}

export function createAdvertisingEmailBlindIndex(value: string) {
  return keyedHash(
    `advertising-inquiry:email:${normalizeAdvertisingEmail(value)}`,
  );
}

export function createAdvertisingRequestFingerprint(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    request.headers.get("x-real-ip")?.trim() ||
    forwardedFor?.split(",")[0]?.trim() ||
    "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 240) ?? "";
  return keyedHash(`advertising-inquiry:request:${ip}:${userAgent}`);
}

export function createAdvertisingIdempotencyHash(idempotencyKey: string) {
  return keyedHash(`advertising-inquiry:idempotency:${idempotencyKey}`);
}

export function createAdvertisingDuplicateHash({
  companyName,
  details,
  promotedOffering,
  workEmail,
}: {
  companyName: string;
  details: string;
  promotedOffering: string;
  workEmail: string;
}) {
  return keyedHash(
    [
      "advertising-inquiry:duplicate",
      normalizeAdvertisingEmail(workEmail),
      normalizeTextForHash(companyName),
      normalizeTextForHash(promotedOffering),
      normalizeTextForHash(details),
    ].join(":"),
  );
}

export function createAdvertisingPublicReference(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  })
    .format(now)
    .replaceAll("-", "");
  const random = randomBytes(6);
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix +=
      PUBLIC_REFERENCE_ALPHABET[
        (random[index] ?? 0) % PUBLIC_REFERENCE_ALPHABET.length
      ];
  }
  return `AD-${date}-${suffix}`;
}

export function createHoneypotPublicReference(request: Request) {
  void request;
  return createAdvertisingPublicReference();
}

function normalizeTextForHash(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR").replace(/\s+/g, " ");
}

function keyedHash(value: string) {
  return createHmac("sha256", readHashPepper()).update(value).digest("hex");
}

function readAdditionalData(
  inquiryId: string,
  field: AdvertisingInquiryProtectedField,
) {
  return Buffer.from(`nuang-advertising-inquiry:${inquiryId}:${field}`, "utf8");
}

function readEncryptionKey() {
  const encodedKey = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!encodedKey) throw new Error("FIELD_ENCRYPTION_KEY is required");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be a 32-byte base64 key");
  }
  return key;
}

function readHashPepper() {
  const pepper = process.env.AD_CONTACT_HASH_PEPPER?.trim();
  if (!pepper) throw new Error("AD_CONTACT_HASH_PEPPER is required");
  return pepper;
}

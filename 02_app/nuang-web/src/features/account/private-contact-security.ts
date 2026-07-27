import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

const encryptionVersion = "v1";

export function protectPrivateEmail({
  accountId,
  value,
}: {
  accountId: string;
  value: string;
}) {
  const normalizedValue = normalizePrivateEmail(value);
  const protectedValue = protectPrivateValue({
    accountId,
    field: "email",
    normalizedValue,
  });

  return {
    ...protectedValue,
    lookupHash: createEmailLookupHash(normalizedValue),
    maskedValue: maskPrivateEmail(normalizedValue),
    normalizedValue,
  };
}

export function protectPrivateMobilePhone({
  accountId,
  value,
}: {
  accountId: string;
  value: string;
}) {
  const normalizedValue = normalizeKoreanMobilePhone(value);
  const protectedValue = protectPrivateValue({
    accountId,
    field: "mobile_phone",
    normalizedValue,
  });

  return {
    ...protectedValue,
    lookupHash: createMobilePhoneLookupHash(normalizedValue),
    maskedValue: maskKoreanMobilePhone(normalizedValue),
    normalizedValue,
  };
}

export function revealPrivateEmail({
  accountId,
  ciphertext,
}: {
  accountId: string;
  ciphertext: string;
}) {
  return revealPrivateValue({
    accountId,
    ciphertext,
    field: "email",
  });
}

export function revealPrivateMobilePhone({
  accountId,
  ciphertext,
}: {
  accountId: string;
  ciphertext: string;
}) {
  return revealPrivateValue({
    accountId,
    ciphertext,
    field: "mobile_phone",
  });
}

export function createEmailLookupHash(value: string) {
  const normalizedValue = normalizePrivateEmail(value);
  return createHmac("sha256", readLookupPepper())
    .update(`nuang-private-contact:email:${normalizedValue}`)
    .digest("hex");
}

export function normalizePrivateEmail(value: string) {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  if (
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new Error("Invalid private email");
  }
  return normalized;
}

export function maskPrivateEmail(value: string) {
  const normalized = normalizePrivateEmail(value);
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

function protectPrivateValue({
  accountId,
  field,
  normalizedValue,
}: {
  accountId: string;
  field: "email" | "mobile_phone";
  normalizedValue: string;
}) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    readEncryptionKey(),
    initializationVector,
  );
  cipher.setAAD(readAdditionalData(accountId, field));
  const encrypted = Buffer.concat([
    cipher.update(normalizedValue, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: [
      encryptionVersion,
      initializationVector.toString("base64url"),
      encrypted.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
    ].join("."),
  };
}

function revealPrivateValue({
  accountId,
  ciphertext,
  field,
}: {
  accountId: string;
  ciphertext: string;
  field: "email" | "mobile_phone";
}) {
  const [version, encodedIv, encodedPayload, encodedTag, ...rest] =
    ciphertext.split(".");
  if (
    version !== encryptionVersion ||
    !encodedIv ||
    !encodedPayload ||
    !encodedTag ||
    rest.length > 0
  ) {
    throw new Error("Unknown private contact ciphertext");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    readEncryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAAD(readAdditionalData(accountId, field));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedPayload, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createMobilePhoneLookupHash(value: string) {
  const normalizedValue = normalizeKoreanMobilePhone(value);
  return createHmac("sha256", readLookupPepper())
    .update(`nuang-private-contact:mobile_phone:${normalizedValue}`)
    .digest("hex");
}

export function normalizeKoreanMobilePhone(value: string) {
  const digits = value.trim().replace(/\D/g, "");
  if (!/^010\d{8}$/.test(digits)) {
    throw new Error("Invalid Korean mobile phone number");
  }
  return digits;
}

export function maskKoreanMobilePhone(value: string) {
  const digits = normalizeKoreanMobilePhone(value);
  return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
}

function readAdditionalData(
  accountId: string,
  field: "email" | "mobile_phone",
) {
  return Buffer.from(
    `nuang-private-contact:${accountId}:${field}`,
    "utf8",
  );
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

function readLookupPepper() {
  const pepper = process.env.SHARE_TOKEN_PEPPER?.trim();
  if (!pepper) throw new Error("SHARE_TOKEN_PEPPER is required");
  return pepper;
}

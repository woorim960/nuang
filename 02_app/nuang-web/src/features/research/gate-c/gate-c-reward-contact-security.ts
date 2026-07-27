import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import type { GateCRewardContactMethod } from "@/features/research/gate-c/gate-c-reward-entry-contract";

const encryptionVersion = "v1";

type ContactIdentity = {
  campaignId: string;
  method: GateCRewardContactMethod;
  value: string;
};

export function protectGateCRewardContact(identity: ContactIdentity) {
  const normalizedValue = normalizeGateCRewardContact(
    identity.method,
    identity.value,
  );
  const key = readEncryptionKey();
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, initializationVector);
  cipher.setAAD(readAdditionalData(identity));
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
    lookupHash: createLookupHash("contact", identity, normalizedValue),
    normalizedValue,
  };
}

export function revealGateCRewardContact(
  identity: Omit<ContactIdentity, "value">,
  ciphertext: string,
) {
  const [version, encodedIv, encodedPayload, encodedTag, ...rest] =
    ciphertext.split(".");
  if (
    version !== encryptionVersion ||
    !encodedIv ||
    !encodedPayload ||
    !encodedTag ||
    rest.length > 0
  ) {
    throw new Error("Unknown Gate C reward contact ciphertext");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    readEncryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAAD(readAdditionalData(identity));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedPayload, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createGateCRewardReceiptLookupHash(
  campaignId: string,
  publicReceiptId: string,
) {
  return createLookupHash(
    "receipt",
    { campaignId, method: "receipt" },
    publicReceiptId,
  );
}

export function normalizeGateCRewardContact(
  method: GateCRewardContactMethod,
  value: string,
) {
  const trimmed = value.trim();

  if (method === "email") {
    const normalized = trimmed.toLowerCase();
    if (
      normalized.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ) {
      throw new Error("Invalid reward contact email");
    }
    return normalized;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!/^010\d{8}$/.test(digits)) {
    throw new Error("Invalid Korean mobile phone number");
  }
  return digits;
}

function createLookupHash(
  namespace: "contact" | "receipt",
  identity: { campaignId: string; method: string },
  value: string,
) {
  return createHmac("sha256", readLookupPepper())
    .update(
      [
        "gate-c-reward-entry",
        namespace,
        identity.campaignId,
        identity.method,
        value,
      ].join(":"),
    )
    .digest("hex");
}

function readAdditionalData(identity: {
  campaignId: string;
  method: GateCRewardContactMethod;
}) {
  return Buffer.from(
    `gate-c-reward-entry:${identity.campaignId}:${identity.method}`,
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

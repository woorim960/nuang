import { createHmac, randomBytes, randomUUID } from "node:crypto";

export function createGateCSecret(byteLength = 24) {
  return randomBytes(byteLength).toString("base64url");
}

export function createGateCIdentifiers() {
  const sessionId = randomUUID();
  const publicReceiptId = randomUUID();

  return {
    participantCode: `GC-${publicReceiptId.slice(0, 8).toUpperCase()}`,
    publicReceiptId,
    sessionId,
  };
}

export function hashGateCSecret(secret: string) {
  const pepper = process.env.SHARE_TOKEN_PEPPER?.trim();
  if (!pepper) throw new Error("SHARE_TOKEN_PEPPER is required");
  return createHmac("sha256", pepper).update(secret).digest("hex");
}

export function isAllowedGateCRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}

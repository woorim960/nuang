import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type GateCAssignmentProofPayload = {
  items: Array<{
    orderIndex: number;
    studyItemId: string;
  }>;
  poolVersion: string;
  sessionId: string;
  version: 1;
};

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
  return createHmac("sha256", readPepper()).update(secret).digest("hex");
}

export function createGateCRequestFingerprint(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 240) ?? "";
  const language = request.headers.get("accept-language")?.slice(0, 120) ?? "";

  return createHmac("sha256", readPepper())
    .update(`gate-c-request:${ip}:${userAgent}:${language}`)
    .digest("hex");
}

export async function checkGateCRequestGuard({
  action,
  client,
  request,
}: {
  action: "complete_session" | "start_session" | "withdraw_submission";
  client: SupabaseClient;
  request: Request;
}) {
  const response = (await client.rpc("check_gate_c_request_guard", {
    p_action: action,
    p_subject_hash: createGateCRequestFingerprint(request),
  })) as {
    data: string | null;
    error: { code?: string } | null;
  };

  if (response.error) return "guard_unavailable" as const;
  if (response.data === null) return null;
  if (response.data === "rate_limited") return "rate_limited" as const;
  return "guard_unavailable" as const;
}

export function isAllowedGateCRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}

export function createGateCAssignmentProof({
  items,
  poolVersion,
  sessionId,
}: Omit<GateCAssignmentProofPayload, "version">) {
  const encodedPayload = Buffer.from(
    JSON.stringify({
      items: items.map((item) => ({
        orderIndex: item.orderIndex,
        studyItemId: item.studyItemId,
      })),
      poolVersion,
      sessionId,
      version: 1,
    } satisfies GateCAssignmentProofPayload),
  ).toString("base64url");
  return `${encodedPayload}.${signAssignmentPayload(encodedPayload)}`;
}

export function verifyGateCAssignmentProof(
  proof: string,
  expectedSessionId: string,
) {
  const [encodedPayload, suppliedSignature, ...rest] = proof.split(".");
  if (!encodedPayload || !suppliedSignature || rest.length > 0) return null;

  const expectedSignature = signAssignmentPayload(encodedPayload);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as unknown;
    if (!isAssignmentProofPayload(payload)) return null;
    if (payload.sessionId !== expectedSessionId) return null;
    return payload;
  } catch {
    return null;
  }
}

function signAssignmentPayload(payload: string) {
  return createHmac("sha256", readPepper())
    .update(`gate-c-assignment:${payload}`)
    .digest("base64url");
}

function readPepper() {
  const pepper = process.env.SHARE_TOKEN_PEPPER?.trim();
  if (!pepper) throw new Error("SHARE_TOKEN_PEPPER is required");
  return pepper;
}

function isAssignmentProofPayload(
  value: unknown,
): value is GateCAssignmentProofPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  if (
    payload.version !== 1 ||
    typeof payload.sessionId !== "string" ||
    typeof payload.poolVersion !== "string" ||
    !Array.isArray(payload.items) ||
    payload.items.length !== 12
  ) {
    return false;
  }

  return payload.items.every((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    return (
      row.orderIndex === index + 1 &&
      typeof row.studyItemId === "string" &&
      row.studyItemId.length >= 1 &&
      row.studyItemId.length <= 120
    );
  });
}

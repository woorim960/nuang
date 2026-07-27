import { beforeEach, describe, expect, it } from "vitest";
import {
  checkGateCRequestGuard,
  createGateCAssignmentProof,
  createGateCRequestFingerprint,
  verifyGateCAssignmentProof,
} from "@/features/research/gate-c/gate-c-server-security";
import type { SupabaseClient } from "@supabase/supabase-js";

const sessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const items = Array.from({ length: 12 }, (_, index) => ({
  orderIndex: index + 1,
  studyItemId: `NX-${String(index + 1).padStart(3, "0")}`,
}));

describe("Gate C signed assignment proof", () => {
  beforeEach(() => {
    process.env.SHARE_TOKEN_PEPPER = "test-assignment-proof-pepper";
  });

  it("round-trips the exact server assignment", () => {
    const proof = createGateCAssignmentProof({
      items,
      poolVersion: "MIXED-1.0",
      sessionId,
    });

    expect(verifyGateCAssignmentProof(proof, sessionId)).toEqual({
      items,
      poolVersion: "MIXED-1.0",
      sessionId,
      version: 1,
    });
  });

  it("rejects a changed assignment or another session", () => {
    const proof = createGateCAssignmentProof({
      items,
      poolVersion: "MIXED-1.0",
      sessionId,
    });
    const [payload, signature] = proof.split(".");

    expect(
      verifyGateCAssignmentProof(
        `${payload.slice(0, -1)}A.${signature}`,
        sessionId,
      ),
    ).toBeNull();
    expect(
      verifyGateCAssignmentProof(proof, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    ).toBeNull();
  });
});

describe("Gate C anonymous request guard", () => {
  beforeEach(() => {
    process.env.SHARE_TOKEN_PEPPER = "test-request-guard-pepper";
  });

  it("creates a stable one-way request fingerprint", () => {
    const request = new Request("https://nuang.test/research/gate-c", {
      headers: {
        "accept-language": "ko-KR",
        "user-agent": "test-browser",
        "x-forwarded-for": "203.0.113.10",
      },
    });
    const fingerprint = createGateCRequestFingerprint(request);

    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprint).not.toContain("203.0.113.10");
    expect(createGateCRequestFingerprint(request)).toBe(fingerprint);
  });

  it("fails closed when the database guard is unavailable", async () => {
    const client = {
      rpc: async () => ({
        data: null,
        error: { code: "PGRST202" },
      }),
    } as unknown as SupabaseClient;

    await expect(
      checkGateCRequestGuard({
        action: "start_session",
        client,
        request: new Request("https://nuang.test/research/gate-c"),
      }),
    ).resolves.toBe("guard_unavailable");
  });
});

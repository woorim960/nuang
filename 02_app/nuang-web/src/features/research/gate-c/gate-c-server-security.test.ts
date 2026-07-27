import { beforeEach, describe, expect, it } from "vitest";
import {
  createGateCAssignmentProof,
  verifyGateCAssignmentProof,
} from "@/features/research/gate-c/gate-c-server-security";

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

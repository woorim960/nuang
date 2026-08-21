import { describe, expect, it } from "vitest";
import {
  mapClaimResultRpcError,
  shouldRebuildRepresentativeProfileAfterClaim,
} from "@/features/account/server-writes";

describe("claim representative-profile containment", () => {
  it("keeps candidate core claims archive-only after the atomic result write", () => {
    expect(
      shouldRebuildRepresentativeProfileAfterClaim({
        trustedRelease: {
          assessmentReleaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
          codeSchemeVersion: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
          scoringModelVersion: "candidate-model",
          scoringReleaseId: "NUANG-CORE-FULL-CANDIDATE-SCORING-1.0",
        },
      }),
    ).toBe(false);
  });

  it("keeps an unapproved nonlegacy release closed until G14 activates an exact bundle", () => {
    expect(
      shouldRebuildRepresentativeProfileAfterClaim({
        trustedRelease: {
          assessmentReleaseId: "NUANG-CORE-ACTIVE-2.0",
          codeSchemeVersion: "NUANG-CODE-5AXIS-ACTIVE-2.0",
          scoringModelVersion: "active-model",
          scoringReleaseId: "NUANG-CORE-ACTIVE-SCORING-2.0",
        },
      }),
    ).toBe(false);
  });
});

describe("claim result RPC failure mapping", () => {
  it("maps only the deletion tombstone rejection to a terminal deleted result", () => {
    expect(
      mapClaimResultRpcError({
        code: "P0001",
        message: "persisted_result_deleted",
      }),
    ).toBe("result_deleted");

    expect(
      mapClaimResultRpcError({
        code: "P0001",
        message: "incomplete_existing_result_claim",
      }),
    ).toBe("result_report_write_failed");
    expect(
      mapClaimResultRpcError({
        code: "23505",
        message: "persisted_result_deleted",
      }),
    ).toBe("result_report_write_failed");
    expect(mapClaimResultRpcError(null)).toBe("result_report_write_failed");
  });
});

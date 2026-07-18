import { describe, expect, it } from "vitest";
import {
  createPublicProfileSnapshotWriteFailurePayload,
  createPublicProfileSnapshotWriteSuccessPayload,
  publicProfileSnapshotWriteFailures,
  publicProfileSnapshotWriteSteps,
} from "@/features/public-profile/public-profile-snapshot-write-contract";
import { createPublicProfileSnapshotPayload } from "@/features/together/public-comparison-contract";
import type { CoreScoreResult } from "@/lib/scoring/types";

const result: CoreScoreResult = {
  alternativeCodes: [],
  code: "TVOAE",
  domains: [
    {
      domainId: "SE",
      isBoundary: false,
      label: "사람 사이 에너지",
      score: 72,
      status: "valid",
      symbol: "T",
    },
  ],
  facets: [],
  profileName: "불꽃의 온기 탐험가",
};

describe("public profile snapshot write contract", () => {
  it("keeps write steps ordered around public projection and audit", () => {
    expect(publicProfileSnapshotWriteSteps.map((step) => step.id)).toEqual([
      "ensure_account_result_report",
      "read_profile_visibility_settings",
      "project_public_snapshot_payload",
      "upsert_profile_public_snapshot",
      "mark_previous_public_snapshots_stale",
      "record_visibility_audit_event",
    ]);
  });

  it("maps snapshot write failures to public response payloads", () => {
    Object.entries(publicProfileSnapshotWriteFailures).forEach(([code, failure]) => {
      const payload = createPublicProfileSnapshotWriteFailurePayload(
        code as keyof typeof publicProfileSnapshotWriteFailures,
      );

      expect(payload.ok).toBe(false);
      expect(payload.error).toBe("public_profile_snapshot_write_failed");
      expect(payload.code).toBe(code);
      expect(payload.message).toBe(failure.message);
      expect(payload.retryable).toBe(failure.retryable);
      expect(payload.step).toBe(failure.step);
      expect(failure.httpStatus).toBeGreaterThanOrEqual(400);
    });
  });

  it("returns active snapshot write payloads without private surfaces", () => {
    const snapshot = createPublicProfileSnapshotPayload({
      createdAt: "2026-07-04T00:00:00.000Z",
      displayProfile: {
        displayName: "탐험가",
        motif: "flame",
      },
      result,
      snapshotId: "11111111-1111-4111-8111-111111111111",
    });
    const payload = createPublicProfileSnapshotWriteSuccessPayload(snapshot);
    const publicJson = JSON.stringify(payload);

    expect(payload.snapshot.status).toBe("active");
    expect(payload.privacy.includesDirectResponses).toBe(false);
    expect(payload.privacy.includesRawScorePayload).toBe(false);
    expect(publicJson).not.toContain("itemId");
    expect(publicJson).not.toContain("provider_subject");
    expect(publicJson).not.toContain("email");
  });
});

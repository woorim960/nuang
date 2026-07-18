import { describe, expect, it } from "vitest";
import {
  apiClosedStates,
  createApiClosedPayload,
  type ApiClosedStateId,
} from "@/lib/api/closed-state";

describe("api closed state", () => {
  const stateIds = Object.keys(apiClosedStates) as ApiClosedStateId[];

  it("keeps every closed server feature in a standard payload shape", () => {
    expect(stateIds).toEqual([
      "feed_write_db_pending",
      "profile_visibility_db_write_pending",
      "public_comparison_db_write_pending",
      "public_comparison_lookup_pending",
      "result_claim_db_write_pending",
      "share_link_create_db_write_pending",
      "share_link_revoke_db_write_pending",
      "supabase_env_missing",
    ]);

    stateIds.forEach((stateId) => {
      const payload = createApiClosedPayload(stateId);

      expect(payload.ok).toBe(false);
      expect(payload.error).toBe("feature_closed");
      expect(payload.code).toBe(apiClosedStates[stateId].code);
      expect(payload.feature.status).toBe("closed");
      expect(payload.message.length).toBeGreaterThan(20);
      expect(payload.blockedBy.length).toBeGreaterThan(0);
      expect(payload.display.blockedBy.length).toBeGreaterThan(0);
      expect(payload.display.message.length).toBeGreaterThan(10);
      expect(payload.display.nextStep.length).toBeGreaterThan(20);
      expect(payload.nextStep.length).toBeGreaterThan(20);
      expect(payload.safeFallback.length).toBeGreaterThan(20);
      expect(JSON.stringify(payload)).not.toContain("ownerUserId");
    });
  });

  it("keeps user-facing closed-state copy free of implementation jargon", () => {
    stateIds.forEach((stateId) => {
      const payload = createApiClosedPayload(stateId);
      const displayText = [
        payload.feature.label,
        payload.display.message,
        payload.display.nextStep,
        payload.safeFallback,
        ...payload.display.blockedBy,
      ].join(" ");

      expect(displayText).not.toMatch(
        /Supabase|RLS|URL\/key|credential|DB|payload|skeleton|seed|preview|callback/i,
      );
    });
  });

  it("separates credential-required and server-implementation-pending states", () => {
    expect(createApiClosedPayload("supabase_env_missing").feature.stage).toBe(
      "credential_required",
    );
    expect(apiClosedStates.supabase_env_missing.httpStatus).toBe(503);

    [
      "result_claim_db_write_pending",
      "feed_write_db_pending",
      "profile_visibility_db_write_pending",
      "public_comparison_lookup_pending",
      "public_comparison_db_write_pending",
      "share_link_create_db_write_pending",
      "share_link_revoke_db_write_pending",
    ].forEach((stateId) => {
      const typedStateId = stateId as ApiClosedStateId;
      expect(createApiClosedPayload(typedStateId).feature.stage).toBe(
        "server_implementation_pending",
      );
      expect(apiClosedStates[typedStateId].httpStatus).toBe(501);
    });
  });

  it("keeps auth credential copy aligned with policy approval gates", () => {
    const payload = createApiClosedPayload("supabase_env_missing");

    expect(payload.display.blockedBy).toContain("약관·개인정보 승인");
    expect(payload.display.nextStep).toContain("약관·개인정보 최종 문서");
    expect(payload.safeFallback).toContain("정책 준비 문서");
    expect(payload.blockedBy).toContain("final terms/privacy approval");
  });
});

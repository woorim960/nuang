import { describe, expect, it } from "vitest";
import {
  adminAdvertisingCampaignWriteSchema,
  adminAdvertisingInquiryActionSchema,
  adminAdvertisingInventoryActionSchema,
  adminAdvertisingKillSwitchActionSchema,
} from "./admin-advertising-contract";

describe("admin advertising action contracts", () => {
  it("requires an audited inquiry reason and accepts the urgent priority", () => {
    expect(
      adminAdvertisingInquiryActionSchema.safeParse({
        inquiryId: "22222222-2222-4222-8222-222222222222",
        nextActionAt: "2026-08-03T00:00:00.000Z",
        priority: "urgent",
        reason: "오늘 안에 제안 가능 여부를 확인합니다.",
        status: "reviewing",
      }).success,
    ).toBe(true);
    expect(
      adminAdvertisingInquiryActionSchema.safeParse({
        inquiryId: "22222222-2222-4222-8222-222222222222",
        nextActionAt: null,
        priority: "normal",
        reason: " ",
        status: "closed",
      }).success,
    ).toBe(false);
  });

  it("requires the exact kill-switch scope and a reason", () => {
    expect(
      adminAdvertisingKillSwitchActionSchema.parse({
        key: "HOME_INLINE_01",
        reason: "사용자 보호 지표를 다시 확인합니다.",
        scope: "slot",
        suspended: true,
      }),
    ).toMatchObject({ scope: "slot", suspended: true });
  });

  it("validates campaign creation and guarded inventory rollout values", () => {
    expect(
      adminAdvertisingCampaignWriteSchema.safeParse({
        budgetNote: null,
        campaignId: null,
        endsAt: "2026-09-30T00:00:00.000Z",
        inquiryId: null,
        name: "가을 홈 캠페인",
        objective: "awareness",
        placementKeys: ["HOME_INLINE_01"],
        policyVersion: "advertising-v1",
        provider: "adsense",
        reason: "승인된 운영 계획에 따라 초안을 등록합니다.",
        startsAt: "2026-09-01T00:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      adminAdvertisingInventoryActionSchema.safeParse({
        activeFrom: null,
        activeUntil: null,
        dailyCap: 1,
        isActive: true,
        minimumIntervalSeconds: 180,
        minimumOrganicCount: 4,
        placementKey: "HOME_INLINE_01",
        reason: "보호 지표를 확인하고 10%부터 시작합니다.",
        rolloutPercentage: 101,
        sessionCap: 1,
      }).success,
    ).toBe(false);
  });
});

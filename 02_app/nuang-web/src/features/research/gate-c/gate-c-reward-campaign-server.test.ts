import { afterEach, describe, expect, it, vi } from "vitest";
import { readGateCReviewRewardCampaign } from "@/features/research/gate-c/gate-c-reward-campaign-server";

describe("readGateCReviewRewardCampaign", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps entry disabled when the production switch is off", () => {
    vi.stubEnv("GATE_C_REVIEW_EVENT_ENTRY_ENABLED", "false");
    expect(
      readGateCReviewRewardCampaign(new Date("2026-08-05T00:00:00.000Z")),
    ).toMatchObject({
      entryEnabled: false,
      status: "details_pending",
    });
  });

  it.each([
    ["active", "2026-09-30T14:59:59.999Z", true],
    ["closed", "2026-09-30T15:00:00.000Z", false],
  ] as const)(
    "returns %s without a fixed start date",
    (status, now, entryEnabled) => {
      vi.stubEnv("GATE_C_REVIEW_EVENT_ENTRY_ENABLED", "true");

      expect(readGateCReviewRewardCampaign(new Date(now))).toMatchObject({
        announcementLabel: "2026년 10월 1일",
        contactMethod: "mobile_phone",
        entryEnabled,
        periodLabel: "2026년 9월 30일까지",
        status,
      });
    },
  );
});

import { describe, expect, it } from "vitest";
import { marketingCampaignWriteSchema } from "./marketing-email-contract";

const valid = {
  body: "충분히 구체적인 캠페인 본문입니다.",
  campaignId: null,
  ctaLabel: "홈에서 보기",
  ctaUrl: "https://nuang.app/home",
  eyebrow: "NUANG NEWS",
  heading: "새 소식을 확인해 보세요",
  internalName: "2026년 8월 새 검사",
  subject: "새 검사가 열렸어요",
};

describe("marketing campaign contract", () => {
  it("accepts only paired CTA fields on NUANG HTTPS hosts", () => {
    expect(marketingCampaignWriteSchema.safeParse(valid).success).toBe(true);
    expect(
      marketingCampaignWriteSchema.safeParse({
        ...valid,
        ctaUrl: "https://example.com/phishing",
      }).success,
    ).toBe(false);
    expect(
      marketingCampaignWriteSchema.safeParse({
        ...valid,
        ctaLabel: null,
      }).success,
    ).toBe(false);
  });
});

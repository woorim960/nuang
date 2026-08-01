import { describe, expect, it } from "vitest";
import {
  ADVERTISING_INQUIRY_CONSENT_VERSION,
  advertisingInquiryWriteSchema,
} from "@/features/advertising/advertising-inquiry-contract";

describe("advertising inquiry contract", () => {
  it("accepts the public three-step form payload", () => {
    expect(advertisingInquiryWriteSchema.safeParse(validInput()).success).toBe(
      true,
    );
  });

  it("requires dates only for a fixed schedule", () => {
    const result = advertisingInquiryWriteSchema.safeParse({
      ...validInput(),
      desiredEndDate: null,
      desiredStartDate: null,
      scheduleMode: "fixed",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["desiredStartDate", "desiredEndDate"]),
      );
    }
  });

  it("allows only https campaign URLs and the current consent document", () => {
    expect(
      advertisingInquiryWriteSchema.safeParse({
        ...validInput(),
        websiteUrl: "http://example.com",
      }).success,
    ).toBe(false);
    expect(
      advertisingInquiryWriteSchema.safeParse({
        ...validInput(),
        consentDocumentVersion: "old-version",
      }).success,
    ).toBe(false);
  });
});

function validInput() {
  return {
    budgetBand: "1m_3m",
    campaignObjective: "awareness",
    companyName: "뉴앙 파트너",
    consentDocumentVersion: ADVERTISING_INQUIRY_CONSENT_VERSION,
    contactName: "담당자",
    creativeReadiness: "ready",
    desiredEndDate: null,
    desiredStartDate: null,
    details:
      "뉴앙 사용자의 경험을 해치지 않는 브랜드 협업을 함께 논의하고 싶습니다.",
    formStartedAt: "2026-08-01T00:00:00.000Z",
    idempotencyKey: "10000000-0000-4000-8000-000000000001",
    inquiryType: "banner",
    marketingConsent: false,
    phone: null,
    preferredPlacement: "home",
    privacyConsent: true,
    promotedOffering: "새로운 협업형 라이프스타일 서비스",
    scheduleMode: "flexible",
    targetAudience: "자기 이해와 관계에 관심 있는 일반 사용자",
    website: "",
    websiteUrl: "https://example.com/campaign",
    workEmail: "Business@Example.com",
  };
}

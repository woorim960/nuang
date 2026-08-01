import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADVERTISING_INQUIRY_CONSENT_VERSION } from "@/features/advertising/advertising-inquiry-contract";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  drain: vi.fn(),
  serviceClient: {},
  submit: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: mocks.after,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => mocks.serviceClient,
}));

vi.mock("@/features/advertising/server-advertising-inquiries", () => ({
  submitAdvertisingInquiry: mocks.submit,
}));

vi.mock("@/features/advertising/server-advertising-mail-outbox", () => ({
  drainAdvertisingMailOutbox: mocks.drain,
}));

import { POST } from "@/app/api/advertising/inquiries/route";

describe("advertising inquiry API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("AD_CONTACT_HASH_PEPPER", "route-test-pepper");
    mocks.submit.mockResolvedValue({
      created: true,
      createdAt: "2026-08-01T01:00:00.000Z",
      duplicate: false,
      inquiryId: "10000000-0000-4000-8000-000000000001",
      ok: true,
      publicReference: "AD-20260801-ABC234",
    });
    mocks.drain.mockResolvedValue({ claimed: 2, failed: 0, ok: true, sent: 2 });
  });

  it("rejects cross-site submissions before storage", async () => {
    const response = await POST(
      createRequest(validInput(), { "sec-fetch-site": "cross-site" }),
    );
    expect(response.status).toBe(403);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("returns 201 as soon as the atomic database submission succeeds", async () => {
    const response = await POST(createRequest(validInput()));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      inquiryId: "10000000-0000-4000-8000-000000000001",
      ok: true,
      publicReference: "AD-20260801-ABC234",
    });
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.drain).not.toHaveBeenCalled();
  });

  it("keeps the 201 response independent from a later mail failure", async () => {
    mocks.drain.mockRejectedValue(new Error("mail unavailable"));
    const response = await POST(createRequest(validInput()));
    expect(response.status).toBe(201);
    const callback = mocks.after.mock.calls[0]?.[0] as () => Promise<void>;
    await expect(callback()).resolves.toBeUndefined();
  });

  it("absorbs honeypot submissions without writing or scheduling email", async () => {
    const response = await POST(
      createRequest({ ...validInput(), website: "https://spam.example" }),
    );
    expect(response.status).toBe(201);
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ ok: true });
  });

  it("maps the atomic rate limit to 429", async () => {
    mocks.submit.mockResolvedValue({ code: "rate_limited", ok: false });
    const response = await POST(createRequest(validInput()));
    expect(response.status).toBe(429);
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
    workEmail: "business@example.com",
  };
}

function createRequest(
  body: unknown,
  headers: Record<string, string> = { "sec-fetch-site": "same-origin" },
) {
  return new Request("http://localhost/api/advertising/inquiries", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
    method: "POST",
  });
}

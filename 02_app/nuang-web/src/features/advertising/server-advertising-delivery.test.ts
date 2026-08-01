import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppOrigin: vi.fn(() => "https://nuang.example"),
  getClaims: vi.fn(async () => ({ data: { claims: {} }, error: null })),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  getAppOrigin: mocks.getAppOrigin,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getClaims: mocks.getClaims },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => ({ rpc: mocks.rpc })),
}));

import {
  readFeedCoupangDelivery,
  readHomeAdSenseDelivery,
} from "./server-advertising-delivery";

describe("advertising server policy boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADVERTISING_ENABLED", "true");
    vi.stubEnv("ADSENSE_ENABLED", "true");
    vi.stubEnv("ADSENSE_SITE_READY", "true");
    vi.stubEnv("ADSENSE_PRIVACY_READY", "true");
    vi.stubEnv("ADSENSE_CSP_REPORT_ONLY_READY", "true");
    vi.stubEnv("ADSENSE_EEA_CMP_READY", "true");
    vi.stubEnv("ADSENSE_PUBLISHER_ID", "pub-1234567890123456");
    vi.stubEnv("ADSENSE_HOME_SLOT_ID", "1234567890");
    vi.stubEnv("COUPANG_PARTNERS_ENABLED", "true");
    vi.stubEnv("COUPANG_POLICY_READY", "true");
    vi.stubEnv("COUPANG_ALLOWED_DESTINATION_HOSTS", "link.coupang.com");
    vi.stubEnv("COUPANG_ALLOWED_IMAGE_HOSTS", "thumbnail.example.com");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns an AdSense adapter only after every env and database gate passes", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        dailyCap: 1,
        enabled: true,
        provider: "adsense",
        rolloutPercentage: 100,
        routeContext: "home_recommended",
        sessionCap: 1,
      },
      error: null,
    });

    await expect(
      readHomeAdSenseDelivery({ countryCode: "KR", nonce: "nonce-value" }),
    ).resolves.toMatchObject({
      canonicalOrigin: "https://nuang.example",
      dailyCap: 1,
      nonce: "nonce-value",
      publisherId: "ca-pub-1234567890123456",
      sessionCap: 1,
      slotId: "1234567890",
    });
  });

  it("does not even query delivery when a privacy launch gate is missing", async () => {
    vi.stubEnv("ADSENSE_PRIVACY_READY", "false");
    await expect(readHomeAdSenseDelivery({ countryCode: "KR" })).resolves.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns a reviewed Coupang card only after eight organic posts", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        campaignId: "10000000-0000-4000-8000-000000000001",
        creative: {
          altText: "상품 이미지",
          creativeId: "20000000-0000-4000-8000-000000000001",
          description: "검수된 상품 설명",
          destinationUrl: "https://link.coupang.com/a/example",
          disclosure:
            "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.",
          imageUrl: "https://thumbnail.example.com/item.jpg",
          title: "검수된 상품",
        },
        dailyCap: 2,
        enabled: true,
        minimumOrganicCount: 8,
        provider: "coupang",
        rolloutPercentage: 100,
        routeContext: "feed_recommended",
        sessionCap: 1,
      },
      error: null,
    });

    await expect(
      readFeedCoupangDelivery({ organicPostCount: 7 }),
    ).resolves.toBeNull();
    await expect(
      readFeedCoupangDelivery({ organicPostCount: 8 }),
    ).resolves.toMatchObject({
      dailyCap: 2,
      placementKey: "FEED_COMMERCE_01",
      sessionCap: 1,
      title: "검수된 상품",
    });
  });

  it("rejects a creative whose link host is outside the operator allowlist", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        campaignId: "10000000-0000-4000-8000-000000000001",
        creative: {
          altText: "상품 이미지",
          creativeId: "20000000-0000-4000-8000-000000000001",
          description: "상품 설명",
          destinationUrl: "https://example.org/not-approved",
          disclosure: "일정액의 수수료를 제공받습니다.",
          imageUrl: "https://thumbnail.example.com/item.jpg",
          title: "상품",
        },
        enabled: true,
        minimumOrganicCount: 8,
        provider: "coupang",
        rolloutPercentage: 100,
        routeContext: "feed_recommended",
      },
      error: null,
    });

    await expect(
      readFeedCoupangDelivery({ organicPostCount: 8 }),
    ).resolves.toBeNull();
  });
});

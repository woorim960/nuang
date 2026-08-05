import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readAdminProductAnalytics: vi.fn(),
  resolveAdminContext: vi.fn(),
}));

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminContext: mocks.resolveAdminContext,
}));

vi.mock("@/features/admin/server-admin-product-analytics", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/admin/server-admin-product-analytics")
  >("@/features/admin/server-admin-product-analytics");
  return {
    ...actual,
    readAdminProductAnalytics: mocks.readAdminProductAnalytics,
  };
});

import AdminProductAnalyticsPage from "@/app/admin/analytics/page";

describe("AdminProductAnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAdminContext.mockResolvedValue({
      accountId: "admin-account",
      client: { marker: "service" },
      ok: true,
    });
    mocks.readAdminProductAnalytics.mockResolvedValue({
      available: true,
      snapshot: fixture(),
    });
  });

  it("shows aggregate value signals and normalizes an unsupported window", async () => {
    render(
      await AdminProductAnalyticsPage({
        searchParams: Promise.resolve({ days: "365" }),
      }),
    );

    expect(mocks.readAdminProductAnalytics).toHaveBeenCalledWith({
      accountId: "admin-account",
      client: { marker: "service" },
      windowDays: 30,
    });
    expect(screen.getByRole("heading", { name: "제품 분석" })).toBeInTheDocument();
    expect(screen.getByText("30일 활성 사용자")).toBeInTheDocument();
    expect(screen.getByText("가치 확인 지표")).toBeInTheDocument();
    expect(screen.getByText("결과 문장 적합")).toBeInTheDocument();
    expect(screen.getByText(/답변, 결과 내용, 경로/)).toBeInTheDocument();
  });

  it("distinguishes an unavailable aggregate from a valid empty period", async () => {
    mocks.readAdminProductAnalytics.mockResolvedValueOnce({
      available: false,
      snapshot: null,
    });
    const unavailable = render(
      await AdminProductAnalyticsPage({
        searchParams: Promise.resolve({ days: "7" }),
      }),
    );
    expect(
      screen.getByText("제품 분석 집계에 연결하지 못했습니다"),
    ).toBeInTheDocument();
    unavailable.unmount();

    mocks.readAdminProductAnalytics.mockResolvedValueOnce({
      available: true,
      snapshot: fixture({ activeAccounts: 0, totalScreenViews: 0 }),
    });
    render(
      await AdminProductAnalyticsPage({
        searchParams: Promise.resolve({ days: "30" }),
      }),
    );
    expect(
      screen.getByText("선택한 기간에 수집된 이용 데이터가 없습니다"),
    ).toBeInTheDocument();
  });
});

function fixture(
  summaryOverrides: Partial<ReturnType<typeof baseSummary>> = {},
) {
  return {
    areas: [{ area: "home", uniqueAccounts: 3, views: 7 }],
    daily: [{ day: "2026-08-05", uniqueAccounts: 3, views: 7 }],
    generatedAt: "2026-08-05T00:00:00.000Z",
    retentionDays: 90,
    summary: { ...baseSummary(), ...summaryOverrides },
    windowDays: 30,
  };
}

function baseSummary() {
  return {
    activatedAccounts: 1,
    activeAccounts: 4,
    assessmentViewers: 3,
    bugFeedbackCount: 1,
    comparedAccounts: 1,
    completedAccounts: 2,
    completedAttempts: 3,
    eligibleAccounts: 8,
    ideaFeedbackCount: 2,
    lastEventAt: "2026-08-05T00:00:00.000Z",
    newEligibleAccounts: 2,
    repeatAccounts: 2,
    resultDependsCount: 1,
    resultFeedbackCount: 3,
    resultFitCount: 2,
    resultNotFitCount: 0,
    resultViewers: 2,
    sharedAccounts: 1,
    totalScreenViews: 12,
    usabilityFeedbackCount: 1,
  };
}

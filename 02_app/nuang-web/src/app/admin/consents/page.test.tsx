import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminConsentsPage from "@/app/admin/consents/page";
import type { AdminConsentDashboard } from "@/features/admin/server-admin-consents";

const mocks = vi.hoisted(() => ({
  readAdminConsentDashboard: vi.fn(),
}));

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminContext: async () => ({ client: {}, ok: true }),
}));

vi.mock("@/features/admin/server-admin-consents", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/features/admin/server-admin-consents")
    >();
  return {
    ...original,
    readAdminConsentDashboard: mocks.readAdminConsentDashboard,
  };
});

const dashboard: AdminConsentDashboard = {
  analyticsEventsAvailable: false,
  filters: { status: "all", type: "all" },
  generatedAt: "2026-08-03T02:00:00.000Z",
  metrics: {
    analyticsEvents24h: {
      denominator: null,
      state: "unavailable",
      value: null,
    },
    analyticsOptIn: { denominator: 10, state: "ready", value: 60 },
    changes7d: { denominator: 10, state: "ready", value: 4 },
    currentAccounts: { denominator: 10, state: "ready", value: 10 },
    marketingOptIn: { denominator: 10, state: "ready", value: 30 },
    marketingReady: { denominator: 3, state: "ready", value: 2 },
  },
  recentChanges: {
    available: true,
    items: [
      {
        accountRef: "4292E0E7",
        consentVersion: "MARKETING-2026.08",
        recordedAt: "2026-08-03T01:00:00.000Z",
        source: "my_settings",
        status: "revoked",
        type: "marketing",
      },
    ],
  },
};

describe("AdminConsentsPage", () => {
  beforeEach(() => {
    mocks.readAdminConsentDashboard.mockResolvedValue(dashboard);
  });

  it("shows safe read-only metrics while isolating unavailable analytics", async () => {
    render(
      await AdminConsentsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "동의 관리" }),
    ).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(
      screen.getByText("분석 이벤트 저장소 연결 후 집계됩니다"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "회원에게 무엇이 달라지는지 먼저 확인하세요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "가입 필수 동의" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "서비스 개선 이용 데이터" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "광고성 이메일 수신" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/검사 답변, 뉴앙코드/)).toBeInTheDocument();
    expect(
      screen.getByText(/동의율과 실제 발송 준비 인원은 다릅니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "회원 설정 화면 확인" }),
    ).toHaveAttribute("href", "/my/settings/notifications");
    expect(screen.getByText("4292E0E7")).toBeInTheDocument();
    expect(screen.getByText("마이 설정")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(
      "4292e0e7-0353-43f0-9132-f90149badee5",
    );
  });

  it("passes only normalized filters into the server read", async () => {
    render(
      await AdminConsentsPage({
        searchParams: Promise.resolve({ status: "bad", type: "analytics" }),
      }),
    );

    expect(mocks.readAdminConsentDashboard).toHaveBeenCalledWith({
      client: {},
      filters: { status: "all", type: "analytics" },
    });
  });
});

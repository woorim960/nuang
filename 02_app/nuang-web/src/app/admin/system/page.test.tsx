import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminSystemPage from "@/app/admin/system/page";

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminContext: async () => ({ client: {}, ok: true }),
}));

vi.mock("@/features/admin/server-admin-system", () => ({
  readAdminSystem: async () => ({
    database: [],
    environment: [],
    generatedAt: "2026-08-05T00:00:00.000Z",
  }),
}));

describe("AdminSystemPage beta release gates", () => {
  it("shows only the release candidate as required work and keeps deferrals unapproved", async () => {
    render(await AdminSystemPage());

    expect(screen.getByText("필수 5/6")).toBeInTheDocument();
    expect(
      screen.getByText("베타 출시 전에 1개 필수 조건을 해결해야 합니다"),
    ).toBeInTheDocument();
    expect(screen.getByText("베타 내부 기준 완료")).toBeInTheDocument();
    expect(screen.getByText("외부 승인 아님 · 유예")).toBeInTheDocument();
    expect(screen.getByText("사람 검증 아님 · 유예")).toBeInTheDocument();
    expect(
      screen.getByText(
        "운영 DB consent.product_analytics_event와 consent.admin_product_analytics_snapshot 적용·호출 PASS",
      ),
    ).toBeInTheDocument();
  });

  it("explains that OAuth is complete and when it must be checked again", async () => {
    render(await AdminSystemPage());

    expect(
      screen.getByText("Google·Kakao 운영 로그인 완료 기록과 재확인 절차"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/이 네 단계의 실제 운영 왕복은 완료했습니다/),
    ).toBeInTheDocument();
  });
});

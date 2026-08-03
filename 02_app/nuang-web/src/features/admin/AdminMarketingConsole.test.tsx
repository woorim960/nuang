import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminMarketingConsole } from "./AdminMarketingConsole";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("AdminMarketingConsole", () => {
  it("shows a fail-closed operational state before the database release", () => {
    render(
      <AdminMarketingConsole
        adminEmail="operator@example.com"
        data={dashboard({ databaseAvailable: false })}
      />,
    );
    expect(
      screen.getByText("마케팅 이메일 데이터 연결이 필요합니다"),
    ).toBeInTheDocument();
    expect(screen.queryByText("새 이메일 캠페인")).not.toBeInTheDocument();
  });

  it("renders structured composition and readiness without recipient addresses", () => {
    render(
      <AdminMarketingConsole
        adminEmail="operator@example.com"
        data={dashboard({ databaseAvailable: true })}
      />,
    );
    expect(screen.getByText("새 이메일 캠페인")).toBeInTheDocument();
    expect(
      screen.getByText("실제 발송은 안전하게 잠겨 있습니다"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/이메일 제목/)).toBeInTheDocument();
    expect(screen.queryByText("member@example.com")).not.toBeInTheDocument();
  });
});

function dashboard({ databaseAvailable }: { databaseAvailable: boolean }) {
  return {
    audienceAvailable: databaseAvailable,
    audienceCount: 0,
    campaigns: [],
    databaseAvailable,
    generatedAt: "2026-08-03T00:00:00.000Z",
    readiness: {
      checks: [{ key: "send-gate", label: "실제 발송 잠금", ok: false }],
      enabled: false,
      ready: false,
    },
    recentEvents: [],
    totals: {
      bounced: 0,
      complained: 0,
      delivered: 0,
      failed: 0,
      queued: 0,
      sent: 0,
      unsubscribed: 0,
    },
  };
}

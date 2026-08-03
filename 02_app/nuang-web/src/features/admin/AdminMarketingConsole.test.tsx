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

  it("shows an audience connection error instead of misreporting zero people", () => {
    render(
      <AdminMarketingConsole
        adminEmail="operator@example.com"
        data={dashboard({
          audienceAvailable: false,
          databaseAvailable: true,
        })}
      />,
    );
    expect(screen.getByText("연결 확인")).toBeInTheDocument();
    expect(screen.queryByText("0명")).not.toBeInTheDocument();
  });
});

function dashboard({
  databaseAvailable,
  audienceAvailable = databaseAvailable,
}: {
  audienceAvailable?: boolean;
  databaseAvailable: boolean;
}) {
  return {
    audienceAvailable,
    audienceCount: 0,
    campaigns: [],
    databaseAvailable,
    generatedAt: "2026-08-03T00:00:00.000Z",
    operations: {
      channelControl: { paused: false, reason: null, updatedAt: null },
      confirmations: {
        dueWithin30Days: 0,
        failed: 0,
        queued: 0,
        retry: 0,
        sent: 0,
      },
      deliveryTotals: {
        bounced: 0,
        complained: 0,
        delayed: 0,
        delivered: 0,
        failed: 0,
        queued: 0,
        retry: 0,
        sent: 0,
        sending: 0,
        skipped: 0,
        suppressed: 0,
        unsubscribed: 0,
      },
      queue: {
        failed: 0,
        oldestPendingAt: null,
        queued: 0,
        retry: 0,
        sending: 0,
        stale: 0,
      },
      suppressions: {
        active: 0,
        memberUnsubscribed: 0,
        providerRisk: 0,
      },
      webhook: { lastReceivedAt: null, unmatched24h: 0 },
      worker: {
        claimed: 0,
        completionFailed: 0,
        errorCode: null,
        failed: 0,
        finishedAt: null,
        sent: 0,
        startedAt: null,
        status: null,
      },
    },
    readiness: {
      checks: [{ key: "send-gate", label: "실제 발송 잠금", ok: false }],
      enabled: false,
      ready: false,
    },
    recentEvents: [],
    recentOperations: [],
    totals: {
      bounced: 0,
      complained: 0,
      delayed: 0,
      delivered: 0,
      failed: 0,
      queued: 0,
      retry: 0,
      sent: 0,
      sending: 0,
      skipped: 0,
      suppressed: 0,
      unsubscribed: 0,
    },
  };
}

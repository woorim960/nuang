import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { metadata } from "@/app/admin/page";
import { AdminDashboard } from "@/features/admin/AdminDashboard";
import type { AdminOverviewData } from "@/features/admin/server-admin-overview";

const overview: AdminOverviewData = {
  audit: [
    {
      action: "account_suspended",
      createdAt: "2026-07-27T02:00:00.000Z",
      id: "audit-1",
      targetTable: "identity.account",
    },
  ],
  counts: {
    activeMembers: 42,
    completedResearch: 12,
    contentReleases: 3,
    customerFeedback: 6,
    eventEntries: 8,
    newMembers: 4,
    pendingPosts: 2,
    qualitySignals: 2,
    queuedReports: 1,
    reportFeedback: 3,
    researchReviews: 5,
  },
  event: {
    drawCompleted: false,
    winnerCount: 10,
  },
  generatedAt: "2026-08-01T02:00:00.000Z",
  unavailableModules: [],
};

describe("AdminDashboard", () => {
  it("presents real operations as clear mobile actions", () => {
    render(<AdminDashboard data={overview} />);

    expect(
      screen.getByRole("heading", { name: "운영 개요" }),
    ).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /커뮤니티 신고/ })).toHaveAttribute(
      "href",
      "/admin/community?view=reports",
    );
    expect(screen.getByRole("link", { name: /연구 검토/ })).toHaveAttribute(
      "href",
      "/admin/research",
    );
    expect(screen.getByRole("link", { name: "이벤트 운영 열기" })).toHaveAttribute(
      "href",
      "/admin/events",
    );
  });

  it("keeps search protection and removes legacy policy navigation", () => {
    render(<AdminDashboard data={overview} />);

    expect(screen.queryByRole("link", { name: "개인정보 처리방침" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "이용약관" })).not.toBeInTheDocument();
    expect(screen.queryByText("NO-GO")).not.toBeInTheDocument();
    expect(metadata.robots).toEqual({
      follow: false,
      index: false,
    });
  });

  it("separates unavailable data from a real zero count", () => {
    render(
      <AdminDashboard
        data={{
          ...overview,
          counts: {
            ...overview.counts,
            customerFeedback: null,
          },
          unavailableModules: ["고객 의견"],
        }}
      />,
    );

    expect(screen.getByText("일부 연결 확인 필요")).toBeInTheDocument();
    expect(screen.getByText(/고객 의견 연결 상태를 확인/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /고객 의견 처리/ })).toHaveTextContent(
      "확인 필요",
    );
  });
});

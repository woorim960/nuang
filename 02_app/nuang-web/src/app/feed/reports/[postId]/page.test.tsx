import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeedReportSharePage, {
  metadata,
} from "@/app/feed/reports/[postId]/page";

const feedReadMocks = vi.hoisted(() => ({
  createServerFeedReportSharePayload: vi.fn(),
}));

vi.mock("@/features/feed/server-read", () => ({
  createServerFeedReportSharePayload:
    feedReadMocks.createServerFeedReportSharePayload,
}));

describe("FeedReportSharePage", () => {
  it("renders a summary-only shared report detail", async () => {
    feedReadMocks.createServerFeedReportSharePayload.mockResolvedValue({
      body: "SVODE 물결의 새길 개척가 리포트를 공유했어요.",
      createdAt: "2026-07-09T07:10:00.000Z",
      reportShare: {
        assessmentKind: "full",
        completedAt: "2026-07-04T00:00:00.000Z",
        domains: [
          {
            domainId: "SE",
            label: "사람 사이 에너지",
            score: 42,
            symbol: "S",
          },
        ],
        href: "/feed/reports/33333333-3333-4333-8333-333333333333",
        profileCode: "SVODE",
        profileName: "물결의 새길 개척가",
        resultLabel: "현재 가장 가까운 대표 성향",
      },
    });

    render(
      await FeedReportSharePage({
        params: Promise.resolve({
          postId: "33333333-3333-4333-8333-333333333333",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "공개 리포트" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SVODE")).toBeInTheDocument();
    expect(screen.getByText("물결의 새길 개척가")).toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      "문항별 답변, 원점수, 계정 정보는 포함하지 않습니다.",
    );
    expect(
      screen.getByRole("link", { name: "나도 같은 검사 해보기" }),
    ).toHaveAttribute("href", "/assessments/nu-core-quick");
    expect(document.body).not.toHaveTextContent("직접 응답");
    expect(document.body).not.toHaveTextContent("raw score");
  });

  it("keeps noindex metadata for feed report shares", () => {
    expect(metadata.robots).toMatchObject({
      follow: false,
      index: false,
    });
  });
});

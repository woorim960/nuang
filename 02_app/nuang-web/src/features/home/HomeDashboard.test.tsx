import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FeedItem } from "@/features/feed/feed-seed";
import { HomeDashboard } from "@/features/home/HomeDashboard";

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => []),
}));

describe("HomeDashboard", () => {
  it("turns home into a daily personal dashboard", async () => {
    render(<HomeDashboard />);

    expect(
      screen.getByRole("heading", { name: "오늘의 리듬을 열어볼까요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/검사, 리포트, 피드를 한 흐름/),
    ).toBeInTheDocument();
    expect(screen.getByText("오늘의 추천")).toBeInTheDocument();
    expect(
      await screen.findByText("빠른 코어로 오늘의 기준을 만들어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "빠른 코어 시작" }),
    ).toHaveAttribute("href", "/assessments/nu-core-quick");
    expect(screen.getByText("오늘의 메뉴")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /내 성향 자세히 보기/ }),
    ).toHaveAttribute("href", "/my/profile");
    expect(
      screen.getByRole("link", { name: /내 리포트 모아보기/ }),
    ).toHaveAttribute("href", "/my/reports");
    expect(
      screen.getByRole("link", { name: /피드에서 반응 보기/ }),
    ).toHaveAttribute("href", "/feed");
    expect(screen.getByText("오늘의 질문")).toBeInTheDocument();
    expect(screen.getByText("피드 미리보기")).toBeInTheDocument();
    expect(
      screen.getByText("오늘 내 리듬은 어떤 쪽인가요?"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("다른 리듬과 맞춰가는 방법").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("내 성향을 한 장으로 소개한다면"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "피드 전체 보기" }),
    ).toHaveAttribute("href", "/feed");
    expect(screen.getByText("공유와 비교는 내가 정해요")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("피드와 커뮤니티");
    expect(document.body).not.toHaveTextContent("함께 피드");
  });

  it("keeps home free from duplicate bottom-navigation route sections", () => {
    render(<HomeDashboard />);

    expect(screen.queryByLabelText("빠른 시작")).not.toBeInTheDocument();
    expect(screen.queryByText("검사에서 함께까지")).not.toBeInTheDocument();
    expect(screen.queryByText("오늘 추천 루트")).not.toBeInTheDocument();
    expect(
      screen.queryByText("지금 바로 할 수 있는 것"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("검사 홈 열기")).not.toBeInTheDocument();
    expect(screen.queryByText("공개 범위 비교 준비")).not.toBeInTheDocument();
  });

  it("renders feed preview items supplied by the server read model", () => {
    const serverPreviewItems: FeedItem[] = [
      {
        authorHandle: "me",
        authorName: "나",
        avatarLabel: "나",
        body: "실제 피드에 쓴 글이 홈 미리보기에도 같은 흐름으로 보여요.",
        id: "home-preview-server-post",
        kind: "user_post",
        layout: "thread",
        likeLabel: "좋아요 0개",
        priority: -1000,
        replyLabel: "답글 0개",
        targetType: "feed_post",
        timeLabel: "방금",
        title: "오늘의 생각",
      },
    ];

    render(<HomeDashboard feedPreviewItems={serverPreviewItems} />);

    expect(screen.getByText("오늘의 생각")).toBeInTheDocument();
    expect(
      screen.getByText(
        "실제 피드에 쓴 글이 홈 미리보기에도 같은 흐름으로 보여요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("오늘 내 리듬은 어떤 쪽인가요?"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("오늘의 질문")).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommunityReadFeed } from "@/features/community/CommunityReadFeed";
import { communitySafetyTargetSelectEventName } from "@/features/community/safety-action-contract";

vi.mock("@/features/assessment/assessment-storage", () => ({
  getLatestCompletedAttempt: vi.fn(async () => undefined),
}));

describe("CommunityReadFeed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders read-only official feed cards with disabled write actions", () => {
    render(<CommunityReadFeed />);

    expect(screen.getByRole("heading", { name: "지금 볼 수 있는 커뮤니티" })).toBeInTheDocument();
    expect(screen.getAllByText("오늘의 질문").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("navigation", { name: "커뮤니티 피드 그룹 바로가기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "커뮤니티 다음 행동" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "읽은 뒤 바로 이어가기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 기준 만들기 열기" })).toHaveAttribute(
      "href",
      "/assessments",
    );
    expect(screen.getByRole("link", { name: "지도에서 보기 열기" })).toHaveAttribute(
      "href",
      "/map",
    );
    expect(screen.getByRole("link", { name: "공개 범위 확인 열기" })).toHaveAttribute(
      "href",
      "/my",
    );
    expect(screen.getByRole("link", { name: "비교 흐름 보기 열기" })).toHaveAttribute(
      "href",
      "/together/comparison-preview",
    );
    expect(screen.getByRole("link", { name: "오늘 1개 보기" })).toHaveAttribute(
      "href",
      "#community-feed-group-today",
    );
    expect(screen.getByRole("link", { name: "탐색 질문 4개 보기" })).toHaveAttribute(
      "href",
      "#community-feed-group-exploration",
    );
    expect(screen.getByRole("link", { name: "공개와 안전 1개 보기" })).toHaveAttribute(
      "href",
      "#community-feed-group-safety",
    );
    expect(screen.getByRole("heading", { name: "오늘" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "탐색 질문" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공개와 안전" })).toBeInTheDocument();
    expect(screen.getByText("성향 카드는 이렇게 보여줘요")).toBeInTheDocument();
    expect(screen.getByText("다르게 느낀 순간을 어떻게 맞춰볼까요?")).toBeInTheDocument();
    expect(screen.getByText("내 성향지도에서 제일 선명한 부분은?")).toBeInTheDocument();
    expect(screen.getByText("나를 편하게 소개하는 한 문장")).toBeInTheDocument();
    expect(screen.getAllByText("공식 주제").length).toBeGreaterThan(0);
    expect(screen.getByText("읽기 카드 · 공식 질문")).toBeInTheDocument();
    expect(screen.getByText("응답 준비 중")).toBeInTheDocument();
    expect(screen.getByText("반응 128")).toBeInTheDocument();
    expect(screen.getAllByText("공식 주제 카드 · 내 반응 미저장").length).toBeGreaterThan(0);

    expect(
      screen.getByRole("button", { name: "오늘의 질문 반응 준비 확인" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("오늘의 질문 댓글 미리쓰기")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "오늘의 질문 보호 액션 열기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "질문 홈 열기: 오늘의 질문" }),
    ).toHaveAttribute("href", "/together");
    expect(
      screen.getByRole("link", {
        name: "비교 미리보기 열기: 다르게 느낀 순간을 어떻게 맞춰볼까요?",
      }),
    ).toHaveAttribute("href", "/together/comparison-preview");
    expect(
      screen.getByRole("link", {
        name: "성향지도 열기: 내 성향지도에서 제일 선명한 부분은?",
      }),
    ).toHaveAttribute("href", "/map");
    expect(screen.getByRole("heading", { name: "글쓰기는 아직 열기 전이에요" })).toBeInTheDocument();
  });

  it("dispatches a safety target event from a feed card", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    render(<CommunityReadFeed />);

    fireEvent.click(screen.getByRole("button", { name: "오늘의 질문 보호 액션 열기" }));

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: communitySafetyTargetSelectEventName,
      }),
    );
  });
});

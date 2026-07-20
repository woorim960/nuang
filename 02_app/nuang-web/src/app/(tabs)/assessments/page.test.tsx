import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AssessmentsPage from "@/app/(tabs)/assessments/page";

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => []),
}));

describe("AssessmentsPage", () => {
  it("keeps the assessment home focused on core start, labs, and help", () => {
    render(<AssessmentsPage />);

    expect(screen.getByRole("heading", { name: "검사" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "무료 코어부터 가벼운 주제 검사까지, 나를 알아가는 시작점이에요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "3분 빠른 코어" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "빠른 코어 시작: 3분 빠른 코어" }),
    ).toHaveAttribute("href", "/assessments/nu-core-quick");
    expect(
      screen.getByRole("heading", { name: "코어 검사" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("정밀 코어까지 무료로 제공되는 뉴앙의 기본 검사"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "뉴앙 질문 확인 참여: 익명 참여, 약 4분",
      }),
    ).toHaveAttribute("href", "/research/gate-c?from=assessments");
    expect(
      screen.getByText(/성향 결과에는 반영되지 않으며/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "친구 성향 맞히기 시작" }),
    ).toHaveAttribute("href", "/assessments/friend-match");
    expect(
      screen.getByRole("heading", { name: "무료 주제 검사" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /대화 온도:/ })).toHaveAttribute(
      "href",
      "/assessments/topics/conversation-temperature",
    );
    expect(
      screen.getByRole("link", { name: /위로 받는 방식:/ }),
    ).toHaveAttribute("href", "/assessments/topics/comfort-style");
    expect(screen.getByText("다음 업데이트 예정")).toBeInTheDocument();
    expect(screen.getByText(/모임 후 회복/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "별난 성향 연구소" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "도움 연결 허브 열기" }),
    ).toHaveAttribute("href", "/help");
  });

  it("does not duplicate route-navigation and post-result explanation sections", () => {
    render(<AssessmentsPage />);

    expect(screen.queryByText("추천 루트")).not.toBeInTheDocument();
    expect(screen.queryByText("오늘 바로 시작하기")).not.toBeInTheDocument();
    expect(screen.queryByText("결과가 쓰이는 순서")).not.toBeInTheDocument();
    expect(
      screen.queryByText("검사 후 바로 쓰이는 기능"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("성향 카드 피드")).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AssessmentsPage from "@/app/(tabs)/assessments/page";

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => []),
}));

describe("AssessmentsPage", () => {
  it("explains the main assessment routes with clear labels", () => {
    render(<AssessmentsPage />);

    expect(screen.getByRole("heading", { name: "검사" })).toBeInTheDocument();
    expect(screen.getByText("빠른 코어 20문항")).toBeInTheDocument();
    expect(screen.getByText("3분 안에 예비 결과 · 처음이면 여기부터")).toBeInTheDocument();
    expect(screen.getByText("정밀 코어 60문항")).toBeInTheDocument();
    expect(screen.getByText("성향지도와 5글자 코드 · 대표 성향 확정")).toBeInTheDocument();
    expect(screen.getByText("별난 연구소")).toBeInTheDocument();
    expect(screen.getByText("재미형 주제 검사 · 코어 결과 미반영")).toBeInTheDocument();
  });

  it("keeps the next-action flow on the assessment home", () => {
    render(<AssessmentsPage />);

    expect(
      screen.getByRole("region", { name: "뉴앙 다음 행동 흐름" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "결과가 쓰이는 순서" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1단계 검사 열기" })).toHaveAttribute(
      "href",
      "/assessments",
    );
  });
});

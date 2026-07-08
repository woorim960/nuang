import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeDashboard } from "@/features/home/HomeDashboard";

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => []),
}));

describe("HomeDashboard", () => {
  it("uses MVP route labels that match the assessment home language", async () => {
    render(<HomeDashboard />);

    expect(screen.getByRole("heading", { name: "안녕하세요, 탐험가님" })).toBeInTheDocument();
    expect(screen.getAllByText("빠른 코어").length).toBeGreaterThan(0);
    expect(screen.getAllByText("20문항").length).toBeGreaterThan(0);
    expect(screen.getAllByText("정밀 코어").length).toBeGreaterThan(0);
    expect(screen.getAllByText("60문항").length).toBeGreaterThan(0);
    expect(await screen.findByText("빠른 코어로 시작해요")).toBeInTheDocument();
    expect(screen.getByText("빠른 코어 20문항")).toBeInTheDocument();
    expect(
      screen.getByText("3분 안에 예비 결과를 보고, 원하면 정밀 코어 60문항으로 확장해요."),
    ).toBeInTheDocument();
    expect(screen.getByText("성향지도 확인")).toBeInTheDocument();
    expect(screen.getByText("함께 피드 읽기")).toBeInTheDocument();
    expect(screen.getByText("검사 홈 열기")).toBeInTheDocument();
    expect(screen.getByText("공개 범위 비교 준비")).toBeInTheDocument();
  });

  it("keeps the canonical next-action flow visible on home", () => {
    render(<HomeDashboard />);

    expect(
      screen.getByRole("region", { name: "뉴앙 다음 행동 흐름" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "검사에서 함께까지" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1단계 검사 열기" })).toHaveAttribute(
      "href",
      "/assessments",
    );
  });
});

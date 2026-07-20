import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AssessmentsPage from "@/app/(tabs)/assessments/page";

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => []),
}));

describe("AssessmentsPage", () => {
  it("starts as a diverse discovery hub instead of a core-only list", async () => {
    render(<AssessmentsPage />);

    expect(screen.getByRole("heading", { name: "검사" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "어떤 나를 알아보고 싶나요?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "지금 알아보면 재밌는 나" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /사과 방식, 약 3분/ }),
    ).toHaveAttribute("href", "/assessments/topics/apology-style");
    expect(
      screen.getByRole("link", { name: /친구 성향 맞히기/ }),
    ).toHaveAttribute("href", "/assessments/friend-match");
    expect(screen.getByText("뉴앙 코드 여정")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: /첫 성향 검사 시작하기/ }),
    ).toHaveAttribute(
      "href",
      "/assessments/nu-core-quick?returnTo=%2Fassessments",
    );
  });

  it("lets people browse relationship, together, and playful tests in place", () => {
    render(<AssessmentsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "관계" }));
    expect(
      screen.getByRole("heading", { name: "관계 속 내 모습" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /말을 꺼내는 방식/ }),
    ).toHaveAttribute("href", "/assessments/topics/conversation-temperature");

    fireEvent.click(screen.getByRole("tab", { name: "친구와" }));
    expect(
      screen.getByText("서로를 얼마나 알고 있을까요?"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "별난 연구소" }));
    expect(
      screen.getByRole("heading", { name: "별난 성향 연구소" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("2분 선택 놀이")).toHaveLength(3);
  });

  it("does not expose internal QA labels or unavailable catalog items", () => {
    render(<AssessmentsPage />);

    expect(screen.queryByText(/S1|S2/)).not.toBeInTheDocument();
    expect(screen.queryByText(/서버 전송 없음/)).not.toBeInTheDocument();
    expect(screen.queryByText(/공유 닫힘/)).not.toBeInTheDocument();
    expect(screen.queryByText("다음 업데이트 예정")).not.toBeInTheDocument();
    expect(screen.queryByText("모임 후 회복")).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminAssessmentStudio } from "./AdminAssessmentStudio";
import { getBuiltinAssessmentStudioEntries } from "./assessment-studio-sources";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function createDashboard(databaseAvailable = false) {
  const entries = getBuiltinAssessmentStudioEntries();
  return {
    counts: {
      archived: 0,
      blocked: entries.filter((entry) =>
        entry.validationIssues.some((issue) => issue.severity === "blocker"),
      ).length,
      inReview: 0,
      paused: entries.filter((entry) => entry.status === "paused").length,
      published: entries.filter((entry) => entry.status === "published").length,
      total: entries.length,
    },
    databaseAvailable,
    entries,
    generatedAt: "2026-08-03T00:00:00.000Z",
  };
}

describe("AdminAssessmentStudio", () => {
  it("shows every operating category and creates a typed draft from a safe template", () => {
    render(<AdminAssessmentStudio initialDashboard={createDashboard()} />);

    expect(
      screen.getByRole("heading", { name: "검사 스튜디오" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/기본 콘텐츠를 읽기 전용/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "새로 만들기" }));
    expect(screen.getByText("만들 검사 유형")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^주제 검사$/ }));

    expect(
      screen.getByRole("heading", { name: "새 주제 검사" }),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(/고객이 검사 목적을 바로 이해/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "작업본 저장" })).toBeDisabled();
  });

  it("previews question and result information without leaving the editor", () => {
    render(<AdminAssessmentStudio initialDashboard={createDashboard()} />);

    fireEvent.click(screen.getByRole("button", { name: "고객 화면 미리보기" }));

    expect(screen.getByText("실제 고객 문항 선택 화면")).toBeInTheDocument();
    expect(screen.getByText("거의 그렇지 않아요")).toBeInTheDocument();
    expect(screen.getByText("실제 고객 결과 리포트")).toBeInTheDocument();
    expect(screen.getByLabelText("뉴앙 코드 ENAKQ")).toBeInTheDocument();
    expect(screen.queryByText("결과 리포트 예시")).not.toBeInTheDocument();
    expect(screen.getByText("게시 전 확인")).toBeInTheDocument();
  });

  it("uses the same five-choice topic question surface as the customer app", () => {
    render(<AdminAssessmentStudio initialDashboard={createDashboard()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /사과할 때 나는 어떻게 풀어갈까/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "고객 화면 미리보기" }));

    expect(screen.getByText("실제 고객 문항 화면")).toBeInTheDocument();
    expect(screen.getByText("거의 하지 않았어요")).toBeInTheDocument();
    expect(screen.getByText("드물게 했어요")).toBeInTheDocument();
    expect(screen.getAllByText("때때로 했어요").length).toBeGreaterThan(0);
    expect(screen.getAllByText("자주 했어요").length).toBeGreaterThan(0);
    expect(screen.getAllByText("거의 항상 했어요").length).toBeGreaterThan(0);
    expect(screen.getByText("실제 고객 결과 리포트")).toBeInTheDocument();
    expect(screen.getByText("이번 검사와 내 뉴앙코드")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("성향 반영 상태"), {
      target: { value: "unchanged" },
    });
    expect(
      screen.getByRole("heading", { name: "현재 뉴앙 코드는 바뀌지 않아요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "반대쪽 모습도 보임" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "같은 주제 재검사" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("성향 반영 상태"), {
      target: { value: "opposite_seen" },
    });
    expect(
      screen.getByRole("heading", { name: "현재 뉴앙 코드는 바뀌지 않아요" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("성향 반영 상태"), {
      target: { value: "login_required" },
    });
    expect(
      screen.getByRole("link", { name: "로그인하고 이어서 반영하기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "행동별 결과" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "결과 더 자세히 보기" }),
    ).toBeInTheDocument();
  });

  it("uses the shared odd-lab question screen beside its customer result report", () => {
    render(<AdminAssessmentStudio initialDashboard={createDashboard()} />);

    fireEvent.click(screen.getByRole("button", { name: /관계 대화 스타일/ }));
    fireEvent.click(screen.getByRole("button", { name: "고객 화면 미리보기" }));

    expect(screen.getByText("실제 고객 문항 선택 화면")).toBeInTheDocument();
    expect(
      screen.getByText("중요한 이야기가 생기면 나는 보통"),
    ).toBeInTheDocument();
    expect(screen.getByText("실제 고객 결과 리포트")).toBeInTheDocument();
    expect(screen.getByText("게시 전 확인")).toBeInTheDocument();
  });

  it("uses the live balance-game choice runner without creating a room", () => {
    render(<AdminAssessmentStudio initialDashboard={createDashboard()} />);

    fireEvent.click(screen.getByRole("button", { name: /우리 어디갈까/ }));
    fireEvent.click(screen.getByRole("button", { name: "고객 화면 미리보기" }));

    expect(screen.getByText("실제 고객 문항 선택 화면")).toBeInTheDocument();
    expect(
      screen.getByText("지금 더 끌리는 쪽을 골라주세요."),
    ).toBeInTheDocument();
    expect(screen.getByText("실제 고객 결과 리포트")).toBeInTheDocument();
    expect(screen.getByText("점수 기준 보기")).toBeInTheDocument();
  });

  it("shows both live friend-match choice screens without creating an invite", () => {
    render(<AdminAssessmentStudio initialDashboard={createDashboard()} />);

    fireEvent.click(screen.getByRole("button", { name: /친구 성향 맞히기/ }));
    fireEvent.click(screen.getByRole("button", { name: "고객 화면 미리보기" }));

    expect(
      screen.getByText("실제 고객 문항 선택 화면 · 내 선택"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("실제 고객 문항 선택 화면 · 친구 선택"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("같은 상황에서 나는 어떻게 반응할까요?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("나는 실제로 어떤 답을 고를까요?"),
    ).toBeInTheDocument();
  });

  it("lets an operator manage topic scoring links and result scales in structured fields", () => {
    render(<AdminAssessmentStudio initialDashboard={createDashboard()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /사과할 때 나는 어떻게 풀어갈까/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^문항 12$/ }));

    expect(
      screen.getAllByLabelText(/이 문항이 보는 성향 범위/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByLabelText(/이 문항이 측정하는 성향/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByLabelText(/뉴앙코드 반영 방향/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("결과 척도").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "채점·결과" }));
    const before = screen.getByRole("heading", { name: /결과 3개/ });
    expect(before).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "결과 추가" }));
    expect(
      screen.getByRole("heading", { name: /결과 4개/ }),
    ).toBeInTheDocument();
  });
});

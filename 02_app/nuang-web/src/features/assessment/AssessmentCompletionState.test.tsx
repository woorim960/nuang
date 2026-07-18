import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AssessmentCompletionState,
  type AssessmentCompletionViewState,
} from "@/features/assessment/AssessmentCompletionState";

describe("AssessmentCompletionState", () => {
  it("shows the approved quick copy, real item progress, and no normal action", () => {
    renderCompletion("preparing");

    expect(
      screen.getByRole("heading", {
        name: "첫 성향 결과를 준비하고 있어요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/지금의 나와 가장 가까운 성향/),
    ).toBeInTheDocument();
    expect(screen.getByText("20 / 20")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "검사 진행률" }),
    ).toHaveAttribute("aria-valuenow", "20");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /홈|닫기/ }),
    ).not.toBeInTheDocument();
  });

  it("uses distinct precision copy without promising a five-letter code", () => {
    render(
      <AssessmentCompletionState
        isWorking={false}
        mode="full"
        onLeave={vi.fn()}
        onReviewAnswers={vi.fn()}
        onRetry={vi.fn()}
        state="preparing"
        totalItems={60}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "성향 결과를 준비하고 있어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/성향 결과를 자세히/)).toBeInTheDocument();
    expect(screen.queryByText(/다섯 글자/)).not.toBeInTheDocument();
  });

  it("offers the correct recovery and failure actions", () => {
    const onRetry = vi.fn();
    const onLeave = vi.fn();
    const { rerender } = renderCompletion("recovery", { onLeave, onRetry });

    fireEvent.click(screen.getByRole("button", { name: "다시 확인" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "나중에 확인하기" }));
    expect(onLeave).toHaveBeenCalledTimes(1);

    rerender(
      <AssessmentCompletionState
        isWorking={false}
        mode="quick"
        onLeave={onLeave}
        onReviewAnswers={vi.fn()}
        onRetry={onRetry}
        state="failed"
        totalItems={20}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "결과를 준비하지 못했어요" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("does not show a placeholder code when evidence is insufficient", () => {
    const onReviewAnswers = vi.fn();
    renderCompletion("insufficient", { onReviewAnswers });

    expect(
      screen.getByRole("heading", {
        name: "성향을 보여주려면 답이 조금 더 필요해요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("-----")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("main").className).toContain("settled");
    fireEvent.click(screen.getByRole("button", { name: "답 다시 확인하기" }));
    expect(onReviewAnswers).toHaveBeenCalledTimes(1);
  });

  it("routes an undetermined result into additional questions", () => {
    const onReviewAnswers = vi.fn();
    const onLeave = vi.fn();
    renderCompletion("undetermined", { onLeave, onReviewAnswers });

    expect(
      screen.getByRole("heading", {
        name: "비슷하게 나온 코드만 조금 더 확인할게요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/짧은 질문을 더 답하면 결과를 보여드릴게요/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ENAKQ|예비|연구 중/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "추가 질문 이어가기" }));
    expect(onReviewAnswers).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "나중에 이어하기" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("explains a repeated-answer review without calling it a trait tie", () => {
    const onReviewAnswers = vi.fn();
    renderCompletion("response-review", { onReviewAnswers });

    expect(
      screen.getByRole("heading", {
        name: "답을 한 번만 더 살펴봐 주세요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/같은 답이 반복됐어요/)).toBeInTheDocument();
    expect(screen.queryByText(/비슷하게 나온 코드/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "답 다시 살펴보기" }));
    expect(onReviewAnswers).toHaveBeenCalledTimes(1);
  });
});

function renderCompletion(
  state: AssessmentCompletionViewState,
  overrides: {
    onRetry?: () => void;
    onLeave?: () => void;
    onReviewAnswers?: () => void;
  } = {},
) {
  return render(
    <AssessmentCompletionState
      isWorking={false}
      mode="quick"
      onLeave={overrides.onLeave ?? vi.fn()}
      onReviewAnswers={overrides.onReviewAnswers ?? vi.fn()}
      onRetry={overrides.onRetry ?? vi.fn()}
      state={state}
      totalItems={20}
    />,
  );
}

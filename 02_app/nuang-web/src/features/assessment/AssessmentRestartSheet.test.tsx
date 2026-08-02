import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssessmentRestartSheet } from "@/features/assessment/AssessmentRestartSheet";

describe("AssessmentRestartSheet", () => {
  it("explains that a completed result remains before starting a new round", () => {
    const onClose = vi.fn();
    const onRestart = vi.fn();

    render(
      <AssessmentRestartSheet
        assessmentLabel="정밀 성향 검사"
        hasActiveAttempt={false}
        onClose={onClose}
        onRestart={onRestart}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "새 결과를 만들어볼까요?" }),
    ).toBeVisible();
    expect(
      screen.getByText("완료한 이전 결과는 삭제되지 않아요."),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "처음부터 다시 검사하기" }),
    );
    expect(onRestart).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("prioritizes resuming when an active round already exists", () => {
    const onResume = vi.fn();
    const onRestart = vi.fn();

    render(
      <AssessmentRestartSheet
        assessmentLabel="첫 성향 검사"
        hasActiveAttempt
        onClose={vi.fn()}
        onRestart={onRestart}
        onResume={onResume}
        resumeLabel="19번부터 이어하기"
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "답하던 검사가 있어요" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "19번부터 이어하기" }));
    expect(onResume).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", {
        name: "현재 답을 정리하고 처음부터",
      }),
    );
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  AssessmentBottomSheet,
  AssessmentQuestionContent,
  AssessmentQuestionDock,
  AssessmentQuestionHeader,
  AssessmentQuestionPrompt,
  AssessmentQuestionScreen,
  AssessmentScaleResponseOptions,
  AssessmentUnsureControl,
} from "@/features/assessment/AssessmentQuestionControls";
import type { AssessmentUnsureReason } from "@/features/assessment/types";
import type { ResponseValue } from "@/lib/scoring/types";

function QuestionHarness() {
  const [value, setValue] = useState<ResponseValue>();
  const [unsureReason] = useState<AssessmentUnsureReason>();

  return (
    <AssessmentQuestionScreen>
      <AssessmentQuestionHeader
        closeLabel="검사 닫기"
        countLabel="전체 5개 중 2번째 문항"
        current={2}
        onClose={vi.fn()}
        progressLabel="검사 진행률"
        title="공통 검사"
        total={5}
      />
      <AssessmentQuestionContent>
        <AssessmentQuestionPrompt
          contextLabel="약속이 갑자기 바뀌었을 때"
          text="새 계획을 먼저 정하면 마음이 편해진다."
        />
        <AssessmentScaleResponseOptions
          name="shared-question"
          onChange={setValue}
          selectedValue={value}
        />
        <AssessmentUnsureControl
          onOpen={vi.fn()}
          selectedReason={unsureReason}
        />
      </AssessmentQuestionContent>
      <AssessmentQuestionDock
        nextDisabled={!value}
        nextLabel="다음"
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        previousDisabled={false}
      />
    </AssessmentQuestionScreen>
  );
}

describe("AssessmentQuestionControls", () => {
  it("keeps the shared question, response, progress, and dock contract", () => {
    render(<QuestionHarness />);

    expect(
      screen.getByRole("progressbar", { name: "검사 진행률" }),
    ).toHaveAttribute("aria-valuenow", "2");
    expect(
      screen.getByRole("heading", {
        name: "새 계획을 먼저 정하면 마음이 편해진다.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "자주 그래요" }));

    expect(screen.getByRole("radio", { name: "자주 그래요" })).toBeChecked();
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("selects a focused response with the keyboard and unlocks next", async () => {
    const user = userEvent.setup();
    render(<QuestionHarness />);

    const response = screen.getByRole("radio", { name: "자주 그래요" });
    response.focus();
    await user.keyboard("[Space]");

    expect(response).toBeChecked();
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("locks the page, exposes dialog descriptions, traps focus, and closes with Escape", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <AssessmentBottomSheet
        copy="지금까지 답한 내용은 그대로 남아 있어요."
        onClose={onClose}
        title="검사를 잠시 멈출까요?"
      >
        <button type="button">계속 답하기</button>
        <button type="button">나가기</button>
      </AssessmentBottomSheet>,
    );

    const dialog = screen.getByRole("dialog", {
      name: "검사를 잠시 멈출까요?",
    });
    expect(dialog.parentElement).toHaveAttribute("data-modal-layer", "true");
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe("hidden");
    expect(dialog).toHaveAttribute("aria-describedby");
    expect(
      within(dialog).getByText("지금까지 답한 내용은 그대로 남아 있어요."),
    ).toBeInTheDocument();
    expect(dialog).toHaveFocus();

    const closeButton = within(dialog).getByRole("button", { name: "닫기" });
    const lastButton = within(dialog).getByRole("button", { name: "나가기" });
    lastButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();

    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});

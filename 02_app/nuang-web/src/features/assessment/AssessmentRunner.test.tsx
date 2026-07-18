import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssessmentRunner } from "@/features/assessment/AssessmentRunner";
import { prepareAssessmentCompletion } from "@/features/assessment/assessment-completion";
import {
  beginLocalAdaptiveFollowUp,
  beginLocalAttemptCompletion,
  completeLocalAttempt,
  getLatestCompletedAttempt,
  getOrCreateLocalAttempt,
  reopenLocalAttemptForReview,
  saveLocalAnswer,
  saveLocalMilestone,
  saveLocalProgress,
  startLocalAdaptiveFollowUp,
} from "@/features/assessment/assessment-storage";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { fullCoreAssessment } from "@/features/assessment/full-core-seed";
import { quickCoreAssessment } from "@/features/assessment/quick-core-seed";
import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";

const { mockPush, mockReplace } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  beginLocalAdaptiveFollowUp: vi.fn(),
  beginLocalAttemptCompletion: vi.fn(),
  completeLocalAttempt: vi.fn(),
  getLatestCompletedAttempt: vi.fn(),
  getOrCreateLocalAttempt: vi.fn(),
  reopenLocalAttemptForReview: vi.fn(),
  saveLocalAnswer: vi.fn(),
  saveLocalMilestone: vi.fn(),
  saveLocalProgress: vi.fn(),
  startLocalAdaptiveFollowUp: vi.fn(),
}));

describe("AssessmentRunner", () => {
  beforeEach(() => {
    const attempt = createAttempt(quickCoreAssessment);

    vi.clearAllMocks();
    vi.mocked(getLatestCompletedAttempt).mockResolvedValue(undefined);
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue(attempt);
    vi.mocked(beginLocalAttemptCompletion).mockImplementation(
      async (current, completionRequestId, responseSnapshotHash) => ({
        ...current,
        completionRequestId,
        completionStatus: "submitting" as const,
        responseSnapshotHash,
      }),
    );
    vi.mocked(startLocalAdaptiveFollowUp).mockImplementation(
      async (current, adaptiveItemIds) => ({
        ...current,
        adaptiveItemIds,
        adaptiveStatus: "intro" as const,
        currentIndex: current.itemIds.length,
      }),
    );
    vi.mocked(beginLocalAdaptiveFollowUp).mockImplementation(
      async (current) => ({
        ...current,
        adaptiveStatus: "in_progress" as const,
      }),
    );
    vi.mocked(completeLocalAttempt).mockImplementation(
      async (current, options) => {
        const isInsufficient =
          options.resultSnapshot.resultStatus === "insufficient_evidence";

        return {
          ...current,
          ...(isInsufficient
            ? {}
            : { completedAt: "2026-07-18T00:00:00.000Z" }),
          completionRequestId: options.completionRequestId,
          completionStatus: isInsufficient
            ? ("insufficient_evidence" as const)
            : ("completed" as const),
          resultSnapshot: options.resultSnapshot,
          state: isInsufficient
            ? ("in_progress" as const)
            : ("completed" as const),
        };
      },
    );
    vi.mocked(saveLocalAnswer).mockImplementation(
      async (current, answer, currentIndex) => ({
        ...current,
        currentIndex,
        responses: {
          ...current.responses,
          [answer.itemId]: answer,
        },
      }),
    );
    vi.mocked(reopenLocalAttemptForReview).mockImplementation(
      async (current, currentIndex) => ({
        ...current,
        adaptiveItemIds: undefined,
        adaptiveStatus: undefined,
        completionStatus: undefined,
        currentIndex,
        resultSnapshot: undefined,
        state: "in_progress" as const,
      }),
    );
    vi.mocked(saveLocalProgress).mockImplementation(
      async (current, currentIndex) => ({
        ...current,
        currentIndex,
      }),
    );
    vi.mocked(saveLocalMilestone).mockImplementation(
      async (
        current,
        milestoneId,
        status,
        currentIndex = current.currentIndex,
      ) => ({
        ...current,
        currentIndex,
        milestones: {
          ...current.milestones,
          [milestoneId]: {
            contentVersion: "test",
            id: milestoneId,
            shownAt: "2026-07-09T00:00:00.000Z",
            status,
          },
        },
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the approved animated loading surface until the first question is ready", async () => {
    let resolveAttempt!: (attempt: LocalAssessmentAttempt) => void;
    vi.mocked(getOrCreateLocalAttempt).mockReturnValue(
      new Promise<LocalAssessmentAttempt>((resolve) => {
        resolveAttempt = resolve;
      }),
    );

    render(<AssessmentRunner assessment={quickCoreAssessment} />);

    expect(
      screen.getByRole("heading", { name: "검사를 준비하고 있어요" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "질문을 불러오고 있어요",
    );
    expect(
      screen.getByRole("img", {
        name: "성향 신호를 모아 빛나는 핵을 품은 뉴앙 캐릭터",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "검사 준비 진행률" }),
    ).toHaveAttribute("aria-valuetext", "검사 화면을 준비하고 있어요");
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    await act(async () => {
      resolveAttempt(createAttempt(quickCoreAssessment));
      await Promise.resolve();
    });

    expect(
      await screen.findByRole("heading", {
        name: quickCoreAssessment.items[0].text,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "검사를 준비하고 있어요" }),
    ).not.toBeInTheDocument();
  });

  it("uses the production survey shell without a persistent autosave label", async () => {
    render(<AssessmentRunner assessment={quickCoreAssessment} />);

    expect(
      await screen.findByRole("heading", {
        name: quickCoreAssessment.items[0].text,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(quickCoreAssessment.items[0].contextLabel!),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "검사 닫기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "검사 진행률" }),
    ).toHaveAttribute("aria-valuenow", "1");
    expect(
      screen.getByRole("radiogroup", { name: "응답 선택" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("이 문장은 나와 얼마나 비슷한가요?"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(
      screen.getByRole("radio", { name: "나와 전혀 달라요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "나와 매우 비슷해요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 상황은 답하기 어려워요" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(screen.queryByText(/자동 저장/)).not.toBeInTheDocument();
  });

  it("saves a selected answer and opens the next action", async () => {
    render(<AssessmentRunner assessment={quickCoreAssessment} />);

    const response = await screen.findByRole("radio", {
      name: "나와 비슷한 편이에요",
    });
    fireEvent.click(response);

    await waitFor(() => {
      expect(saveLocalAnswer).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(response).toBeChecked();
      expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
    });
  });

  it("keeps an unsaved choice visible and unlocks next after retry", async () => {
    vi.mocked(saveLocalAnswer).mockRejectedValueOnce(new Error("quota"));
    render(<AssessmentRunner assessment={quickCoreAssessment} />);

    const response = await screen.findByRole("radio", {
      name: "나와 매우 비슷해요",
    });
    fireEvent.click(response);

    expect(
      await screen.findByText("보관하지 못했어요", { exact: false }),
    ).toBeInTheDocument();
    expect(response).toBeChecked();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() => {
      expect(saveLocalAnswer).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
    });
  });

  it("records why a question was difficult to judge", async () => {
    render(<AssessmentRunner assessment={quickCoreAssessment} />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "이 상황은 답하기 어려워요",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /상황에 따라 많이 달라져요/ }),
    );

    await waitFor(() => {
      expect(saveLocalAnswer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isUnsure: true,
          unsureReason: "CONTEXT_VARIES",
        }),
        0,
      );
    });
    expect(
      screen.getByRole("button", { name: "상황에 따라 많이 달라져요" }),
    ).toBeInTheDocument();
  });

  it("opens the one-time midpoint checkpoint in the full assessment", async () => {
    const assessment: AssessmentDefinition = {
      ...fullCoreAssessment,
      items: fullCoreAssessment.items.slice(0, 6),
    };
    const attempt = createAttempt(assessment, {
      currentIndex: 2,
      answeredItemCount: 2,
    });
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue(attempt);

    render(<AssessmentRunner assessment={assessment} />);

    fireEvent.click(await screen.findByRole("radio", { name: "반반이에요" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(
      await screen.findByRole("heading", { name: "절반까지 답했어요" }),
    ).toBeInTheDocument();
    expect(saveLocalMilestone).toHaveBeenCalledWith(
      expect.anything(),
      "HALFWAY_BREAK_V1",
      "shown",
      2,
    );
    expect(
      screen.getByRole("button", { name: "계속 답하기" }),
    ).toBeInTheDocument();
  });

  it("moves directly to a stored result when completion finishes within 300ms", async () => {
    const attempt = createAttempt(quickCoreAssessment, {
      answeredItemCount: quickCoreAssessment.items.length,
      currentIndex: quickCoreAssessment.items.length - 1,
    });
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue(attempt);

    render(<AssessmentRunner assessment={quickCoreAssessment} />);

    fireEvent.click(await screen.findByRole("button", { name: "결과 보기" }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(`/results/local/${attempt.id}`);
    });
    expect(
      screen.queryByRole("heading", {
        name: "첫 성향 결과를 준비하고 있어요",
      }),
    ).not.toBeInTheDocument();
    expect(beginLocalAttemptCompletion).toHaveBeenCalledTimes(1);
    expect(completeLocalAttempt).toHaveBeenCalledTimes(1);
  });

  it("reveals the completion surface after 300ms and holds ready for 400ms", async () => {
    vi.useFakeTimers();
    const attempt = createAttempt(quickCoreAssessment, {
      answeredItemCount: quickCoreAssessment.items.length,
      currentIndex: quickCoreAssessment.items.length - 1,
    });
    let resolveCompletion!: (value: LocalAssessmentAttempt) => void;
    const completionPromise = new Promise<LocalAssessmentAttempt>((resolve) => {
      resolveCompletion = resolve;
    });
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue(attempt);
    vi.mocked(completeLocalAttempt).mockReturnValue(completionPromise);

    render(<AssessmentRunner assessment={quickCoreAssessment} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(301);
    });

    expect(
      screen.getByRole("heading", {
        name: "첫 성향 결과를 준비하고 있어요",
      }),
    ).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      resolveCompletion({
        ...attempt,
        completedAt: "2026-07-18T00:00:00.000Z",
        state: "completed",
      });
      await Promise.resolve();
    });

    expect(screen.getByText("결과가 준비됐어요")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(mockReplace).toHaveBeenCalledWith(`/results/local/${attempt.id}`);
  });

  it("moves through slow and recovery states, then retries the same completion request", async () => {
    vi.useFakeTimers();
    const attempt = createAttempt(quickCoreAssessment, {
      answeredItemCount: quickCoreAssessment.items.length,
      currentIndex: quickCoreAssessment.items.length - 1,
    });
    const unresolvedCompletion = new Promise<LocalAssessmentAttempt>(() => {});
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue(attempt);
    vi.mocked(completeLocalAttempt)
      .mockReturnValueOnce(unresolvedCompletion)
      .mockResolvedValueOnce({
        ...attempt,
        completedAt: "2026-07-18T00:00:00.000Z",
        state: "completed",
      });

    render(<AssessmentRunner assessment={quickCoreAssessment} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_001);
    });
    expect(
      screen.getByRole("heading", {
        name: "결과 준비가 조금 더 걸리고 있어요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_999);
    });
    expect(
      screen.getByRole("button", { name: "나중에 확인하기" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 확인" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(beginLocalAttemptCompletion).toHaveBeenCalledTimes(2);
    expect(vi.mocked(beginLocalAttemptCompletion).mock.calls[1][1]).toBe(
      vi.mocked(beginLocalAttemptCompletion).mock.calls[0][1],
    );
    expect(screen.getByText("결과가 준비됐어요")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(mockReplace).toHaveBeenCalledWith(`/results/local/${attempt.id}`);
  });

  it("lets the user safely leave a terminal recovery state", async () => {
    vi.useFakeTimers();
    const attempt = createAttempt(quickCoreAssessment, {
      answeredItemCount: quickCoreAssessment.items.length,
      currentIndex: quickCoreAssessment.items.length - 1,
    });
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue(attempt);
    vi.mocked(completeLocalAttempt).mockReturnValue(
      new Promise<LocalAssessmentAttempt>(() => {}),
    );

    render(<AssessmentRunner assessment={quickCoreAssessment} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    fireEvent.click(screen.getByRole("button", { name: "나중에 확인하기" }));

    expect(mockPush).toHaveBeenCalledWith("/home");
  });

  it("does not complete or show a placeholder code when evidence is insufficient", async () => {
    const attempt = createAttempt(quickCoreAssessment, {
      answeredItemCount: quickCoreAssessment.items.length,
      currentIndex: quickCoreAssessment.items.length - 1,
      unsure: true,
    });
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue(attempt);

    render(<AssessmentRunner assessment={quickCoreAssessment} />);
    fireEvent.click(await screen.findByRole("button", { name: "결과 보기" }));

    expect(
      await screen.findByRole("heading", {
        name: "성향을 보여주려면 답이 조금 더 필요해요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("-----")).not.toBeInTheDocument();
    expect(beginLocalAttemptCompletion).toHaveBeenCalledTimes(1);
    expect(completeLocalAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        evidenceStatus: "insufficient_evidence",
        resultSnapshot: expect.objectContaining({
          resultStatus: "insufficient_evidence",
        }),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "답 다시 확인하기" }));

    expect(
      await screen.findByRole("heading", {
        name: quickCoreAssessment.items[0].text,
      }),
    ).toBeInTheDocument();
  });

  it("reviews one repeated answer pattern instead of opening adaptive questions", async () => {
    const attempt = createAttempt(betaCoreAssessment, {
      answeredItemCount: betaCoreAssessment.items.length,
      currentIndex: betaCoreAssessment.items.length - 1,
    });
    for (const item of betaCoreAssessment.items) {
      attempt.responses[item.itemId] = {
        answeredAt: attempt.updatedAt,
        itemId: item.itemId,
        value: 5,
      };
    }
    attempt.milestones = {
      HALFWAY_BREAK_V1: {
        contentVersion: "test",
        id: "HALFWAY_BREAK_V1",
        resolvedAt: attempt.updatedAt,
        shownAt: attempt.updatedAt,
        status: "completed",
      },
    };
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue(attempt);

    render(<AssessmentRunner assessment={betaCoreAssessment} />);
    fireEvent.click(await screen.findByRole("button", { name: "결과 보기" }));

    expect(
      await screen.findByRole("heading", {
        name: "답을 한 번만 더 살펴봐 주세요",
      }),
    ).toBeInTheDocument();
    expect(startLocalAdaptiveFollowUp).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "답 다시 살펴보기" }));
    await waitFor(() => {
      expect(reopenLocalAttemptForReview).toHaveBeenCalledWith(
        expect.anything(),
        0,
      );
    });
  });

  it("restores a stored insufficient-evidence decision on re-entry", async () => {
    const attempt = createAttempt(quickCoreAssessment, {
      answeredItemCount: quickCoreAssessment.items.length,
      currentIndex: quickCoreAssessment.items.length - 1,
      unsure: true,
    });
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue({
      ...attempt,
      completionRequestId: "completion_insufficient_saved",
      completionStatus: "insufficient_evidence",
      responseSnapshotHash: "snapshot_saved",
    });

    render(<AssessmentRunner assessment={quickCoreAssessment} />);

    expect(
      await screen.findByRole("heading", {
        name: "성향을 보여주려면 답이 조금 더 필요해요",
      }),
    ).toBeInTheDocument();
    expect(beginLocalAttemptCompletion).not.toHaveBeenCalled();
  });

  it("asks only the tied code position, then stores and opens the resolved result", async () => {
    const attempt = createAttempt(betaCoreAssessment, {
      answeredItemCount: betaCoreAssessment.items.length,
      currentIndex: betaCoreAssessment.items.length - 1,
    });
    attempt.milestones = {
      HALFWAY_BREAK_V1: {
        contentVersion: "test",
        id: "HALFWAY_BREAK_V1",
        resolvedAt: attempt.updatedAt,
        shownAt: attempt.updatedAt,
        status: "completed",
      },
    };

    for (const item of betaCoreAssessment.items) {
      attempt.responses[item.itemId] = {
        answeredAt: attempt.updatedAt,
        itemId: item.itemId,
        value: item.domainId === "SE" ? 3 : item.isReverse ? 1 : 5,
      };
    }
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue(attempt);

    render(<AssessmentRunner assessment={betaCoreAssessment} />);
    fireEvent.click(await screen.findByRole("button", { name: "결과 보기" }));

    expect(
      await screen.findByRole("heading", {
        name: "E/I 자리만 조금 더 확인할게요",
      }),
    ).toBeInTheDocument();
    expect(startLocalAdaptiveFollowUp).toHaveBeenCalledWith(
      expect.anything(),
      betaCoreAssessment
        .adaptiveItems!.filter((item) => item.domainId === "SE")
        .map((item) => item.itemId),
    );

    fireEvent.click(screen.getByRole("button", { name: "추가 질문 이어가기" }));
    const seAdaptiveItems = betaCoreAssessment.adaptiveItems!.filter(
      (item) => item.domainId === "SE",
    );

    for (const [index, item] of seAdaptiveItems.entries()) {
      expect(
        await screen.findByRole("heading", { name: item.text }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(4);
      expect(screen.queryByRole("radio", { name: "반반이에요" })).toBeNull();
      expect(
        screen.queryByRole("button", {
          name: "이 상황은 답하기 어려워요",
        }),
      ).toBeNull();

      fireEvent.click(
        screen.getByRole("radio", {
          name: item.isReverse ? "나와 전혀 달라요" : "나와 매우 비슷해요",
        }),
      );
      await waitFor(() => {
        expect(
          screen.getByRole("button", {
            name: index === seAdaptiveItems.length - 1 ? "결과 보기" : "다음",
          }),
        ).toBeEnabled();
      });
      fireEvent.click(
        screen.getByRole("button", {
          name: index === seAdaptiveItems.length - 1 ? "결과 보기" : "다음",
        }),
      );
    }

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(`/results/local/${attempt.id}`);
    });
    const completionOptions = vi
      .mocked(completeLocalAttempt)
      .mock.calls.at(-1)?.[1];
    expect(completionOptions?.resultSnapshot.scoreResult.code?.[0]).toBe("E");
    expect(
      completionOptions?.resultSnapshot.scoreResult.domains.find(
        (domain) => domain.domainId === "SE",
      )?.score,
    ).toBeGreaterThan(50);
  });

  it("upgrades a stored centered result into the adaptive intro on re-entry", async () => {
    const attempt = createAttempt(betaCoreAssessment, {
      answeredItemCount: betaCoreAssessment.items.length,
      currentIndex: 0,
    });

    for (const item of betaCoreAssessment.items) {
      attempt.responses[item.itemId] = {
        answeredAt: attempt.updatedAt,
        itemId: item.itemId,
        value: item.domainId === "SE" ? 3 : item.isReverse ? 1 : 5,
      };
    }
    const readiness = prepareAssessmentCompletion(betaCoreAssessment, attempt);
    const storedAttempt: LocalAssessmentAttempt = {
      ...attempt,
      completionRequestId: "legacy_tie_completion",
      completionStatus: "insufficient_evidence",
      responseSnapshotHash: readiness.responseSnapshotHash,
      resultSnapshot: {
        ...readiness.versionBundle,
        createdAt: attempt.updatedAt,
        responseSnapshotHash: readiness.responseSnapshotHash,
        resultCopyVersion: "core-result-copy.v0.1",
        resultStatus: "insufficient_evidence",
        scoreResult: readiness.result,
      },
    };
    vi.mocked(getOrCreateLocalAttempt).mockResolvedValue(storedAttempt);

    render(<AssessmentRunner assessment={betaCoreAssessment} />);

    expect(
      await screen.findByRole("heading", {
        name: "E/I 자리만 조금 더 확인할게요",
      }),
    ).toBeInTheDocument();
    expect(startLocalAdaptiveFollowUp).toHaveBeenCalledWith(
      storedAttempt,
      betaCoreAssessment
        .adaptiveItems!.filter((item) => item.domainId === "SE")
        .map((item) => item.itemId),
    );
    expect(
      screen.queryByRole("heading", {
        name: betaCoreAssessment.items[0].text,
      }),
    ).toBeNull();
  });
});

function createAttempt(
  assessment: AssessmentDefinition,
  options: {
    answeredItemCount?: number;
    currentIndex?: number;
    unsure?: boolean;
  } = {},
): LocalAssessmentAttempt {
  const answeredItemCount = options.answeredItemCount ?? 0;
  const responses = Object.fromEntries(
    assessment.items.slice(0, answeredItemCount).map((item) => [
      item.itemId,
      {
        answeredAt: "2026-07-09T00:00:00.000Z",
        itemId: item.itemId,
        ...(options.unsure
          ? {
              isUnsure: true,
              unsureReason: "CONTEXT_VARIES" as const,
            }
          : { value: item.isReverse ? (2 as const) : (4 as const) }),
      },
    ]),
  );

  return {
    assessmentId: assessment.assessmentId,
    createdAt: "2026-07-09T00:00:00.000Z",
    currentIndex: options.currentIndex ?? 0,
    expiresAt: "2026-07-16T00:00:00.000Z",
    id: `local_${assessment.assessmentId}_test`,
    itemIds: assessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    milestones: {},
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responses,
    state: "in_progress",
    updatedAt: "2026-07-09T00:00:00.000Z",
  };
}

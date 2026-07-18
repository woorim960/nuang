import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrecisionAssessmentIntro } from "@/features/assessment/PrecisionAssessmentIntro";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { fullCoreAssessment } from "@/features/assessment/full-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";

const mocks = vi.hoisted(() => ({
  getOrCreateLocalAttempt: vi.fn(),
  listLocalAttempts: vi.fn(),
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  resolveLocalPrecisionEntry: vi.fn(),
  saveLocalAttemptReturnDestination: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  getOrCreateLocalAttempt: mocks.getOrCreateLocalAttempt,
  listLocalAttempts: mocks.listLocalAttempts,
  saveLocalAttemptReturnDestination: mocks.saveLocalAttemptReturnDestination,
}));

vi.mock("@/features/assessment/precision-entry", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/features/assessment/precision-entry")
    >();
  return {
    ...original,
    resolveLocalPrecisionEntry: mocks.resolveLocalPrecisionEntry,
  };
});

vi.mock("@/features/assessment/AssessmentRunner", () => ({
  AssessmentRunner: () => <h1>정밀 검사 실행기</h1>,
}));

describe("PrecisionAssessmentIntro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listLocalAttempts.mockResolvedValue([]);
    mocks.saveLocalAttemptReturnDestination.mockImplementation(
      async (attempt) => attempt,
    );
  });

  it("explains the representative-code value without unsupported claims", async () => {
    mocks.resolveLocalPrecisionEntry.mockReturnValue({
      action: "show_intro",
      provisionalCode: null,
      reusableAnswerCount: 0,
      sourceAttempt: undefined,
    });

    renderIntro();

    expect(
      await screen.findByRole("heading", {
        name: "내 성향을 더 자세히 알아볼까요?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("가족·친구·연인과 비교할 수 있어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/다른 사람에게 공개되지 않으며/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/정확도|신뢰도.*배/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "나중에 할게요" }),
    ).not.toBeInTheDocument();
  });

  it("shows a complete example code on the new precision-test intro", async () => {
    mocks.resolveLocalPrecisionEntry.mockReturnValue({
      action: "show_intro",
      provisionalCode: null,
      reusableAnswerCount: 0,
      sourceAttempt: undefined,
    });

    render(
      <PrecisionAssessmentIntro
        assessment={betaCoreAssessment}
        backDestination="/home"
        entrySource="home"
        forceIntro
        requireQuickPrerequisite={false}
        returnDestination="/home"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "내 성향을 다섯 글자로 알아볼까요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("뉴앙 코드 예시 ENAKQ")).toBeInTheDocument();
    expect(
      screen.getByText("내 뉴앙 코드와 자세한 성향 리포트"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "정밀 검사 시작하기" }),
    ).toBeInTheDocument();
  });

  it("preserves the first result, shows verified reuse, and starts once", async () => {
    const sourceAttempt = { id: "local_quick" } as LocalAssessmentAttempt;
    let resolveStart!: (attempt: LocalAssessmentAttempt) => void;
    mocks.resolveLocalPrecisionEntry.mockReturnValue({
      action: "show_intro",
      provisionalCode: "ERGKC",
      reusableAnswerCount: 20,
      sourceAttempt,
    });
    mocks.getOrCreateLocalAttempt.mockReturnValue(
      new Promise<LocalAssessmentAttempt>((resolve) => {
        resolveStart = resolve;
      }),
    );

    renderIntro({
      backDestination: "/results/local/local_quick",
      entrySource: "first-result",
      returnDestination: "/together",
    });

    expect(
      await screen.findByLabelText("방금 확인한 코드 ERGKC"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/이미 답한 내용은 다시 묻지 않아요/),
    ).toBeInTheDocument();
    const start = screen.getByRole("button", { name: "내 대표 코드 알아보기" });
    fireEvent.click(start);
    fireEvent.click(start);

    expect(mocks.getOrCreateLocalAttempt).toHaveBeenCalledTimes(1);
    expect(mocks.getOrCreateLocalAttempt).toHaveBeenCalledWith(
      fullCoreAssessment,
      sourceAttempt,
      "/together",
    );
    expect(screen.getByRole("button", { name: "검사 준비 중" })).toBeDisabled();

    await act(async () => {
      resolveStart({ id: "local_full" } as LocalAssessmentAttempt);
      await Promise.resolve();
    });
    expect(
      await screen.findByRole("heading", { name: "정밀 검사 실행기" }),
    ).toBeInTheDocument();
  });

  it("uses the current five-code language for a first-result entry", async () => {
    const sourceAttempt = {
      id: "local_candidate_quick",
    } as LocalAssessmentAttempt;
    mocks.resolveLocalPrecisionEntry.mockReturnValue({
      action: "show_intro",
      provisionalCode: "ENAKQ",
      reusableAnswerCount: 22,
      sourceAttempt,
    });

    render(
      <PrecisionAssessmentIntro
        assessment={candidateFullCoreAssessment}
        backDestination="/results/local/local_candidate_quick"
        entrySource="first-result"
        returnDestination="/home"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "다섯 글자 속 내 모습을 더 자세히 알아볼까요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("방금 확인한 코드 ENAKQ")).toBeInTheDocument();
    expect(
      screen.getByText(/처음 드는 생각·실제 나타나는 반응/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("원하는 사람과 성향을 비교할 수 있어요"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/60문항/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "정밀 검사 시작하기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "첫 성향 결과로 돌아가기" }),
    ).toHaveAttribute("href", "/results/local/local_candidate_quick");

    fireEvent.click(screen.getByRole("button", { name: "나중에 할게요" }));
    expect(mocks.router.push).toHaveBeenCalledWith("/home");
  });

  it("resumes an active precision attempt without showing the intro", async () => {
    const activeAttempt = {
      id: "local_full_active",
    } as LocalAssessmentAttempt;
    mocks.resolveLocalPrecisionEntry.mockReturnValue({
      action: "redirect_attempt",
      attempt: activeAttempt,
    });
    mocks.getOrCreateLocalAttempt.mockResolvedValue(activeAttempt);

    renderIntro({ returnDestination: "/together" });

    expect(
      await screen.findByRole("heading", { name: "정밀 검사 실행기" }),
    ).toBeInTheDocument();
    expect(mocks.getOrCreateLocalAttempt).toHaveBeenCalledWith(
      fullCoreAssessment,
      undefined,
      "/together",
    );
    expect(
      screen.queryByText("내 성향을 더 자세히 알아볼까요?"),
    ).not.toBeInTheDocument();
  });

  it("keeps the intro visible and provides retry after start failure", async () => {
    mocks.resolveLocalPrecisionEntry.mockReturnValue({
      action: "show_intro",
      provisionalCode: "ERGKC",
      reusableAnswerCount: 20,
      sourceAttempt: { id: "local_quick" },
    });
    mocks.getOrCreateLocalAttempt.mockRejectedValue(new Error("quota"));

    renderIntro();
    fireEvent.click(
      await screen.findByRole("button", { name: "내 대표 코드 알아보기" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "화면은 그대로 두었으니 다시 시도해 주세요",
    );
    expect(
      screen.getByRole("heading", { name: "내 성향을 더 자세히 알아볼까요?" }),
    ).toBeInTheDocument();
  });

  it("redirects completed and missing-prerequisite states without flashing the intro", async () => {
    mocks.resolveLocalPrecisionEntry.mockReturnValueOnce({
      action: "redirect_report",
      attempt: { id: "local_full_completed" },
    });
    const { unmount } = renderIntro();

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith(
        "/results/local/local_full_completed",
      );
    });
    expect(
      screen.queryByText("내 성향을 더 자세히 알아볼까요?"),
    ).not.toBeInTheDocument();
    unmount();

    mocks.resolveLocalPrecisionEntry.mockReturnValueOnce({
      action: "redirect_first_assessment",
    });
    renderIntro();

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith(
        "/assessments/nu-core-quick",
      );
    });
  });
});

function renderIntro(
  overrides: Partial<{
    backDestination: string;
    entrySource: "deep-link" | "first-result" | "home";
    returnDestination: string | null;
  }> = {},
) {
  return render(
    <PrecisionAssessmentIntro
      backDestination={overrides.backDestination ?? "/assessments"}
      entrySource={overrides.entrySource ?? "home"}
      returnDestination={overrides.returnDestination ?? null}
    />,
  );
}

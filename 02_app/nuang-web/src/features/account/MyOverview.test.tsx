import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MyOverview } from "@/features/account/MyOverview";
import { prepareAssessmentCompletion } from "@/features/assessment/assessment-completion";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { coreResultCopyVersion } from "@/features/result/report-copy";

const myOverviewMocks = vi.hoisted(() => ({
  localAttempts: [] as LocalAssessmentAttempt[],
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => myOverviewMocks.localAttempts),
}));

describe("MyOverview", () => {
  afterEach(() => {
    myOverviewMocks.localAttempts = [];
  });

  it("keeps the signed-in profile structure while showing a local result", async () => {
    myOverviewMocks.localAttempts = [createCompletedAttempt()];

    render(<MyOverview initialContent="reports" />);

    expect(
      await screen.findByRole("heading", { name: "나의 뉴앙" }),
    ).toBeInTheDocument();
    expect(screen.getByText("정밀 코어 검사 완료")).toBeInTheDocument();
    expect(screen.getByText("ENAKQ")).toBeInTheDocument();
    expect(screen.getByText("관계를 여는 선도자")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 결과 보기" })).toHaveAttribute(
      "href",
      "/my/reports",
    );
    expect(screen.getByRole("link", { name: "내 성향 상세" })).toHaveAttribute(
      "href",
      "/my/reports",
    );
    expect(screen.getByRole("link", { name: "의견 보내기" })).toHaveAttribute(
      "href",
      "/my/feedback?from=%2Fmy",
    );
    expect(screen.getByRole("tab", { name: /게시물/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /검사 결과/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("link", { name: "검사 결과 보기" }),
    ).toHaveAttribute("href", "/my/reports");
  });

  it("gives a first-time viewer the same profile, shortcuts, and tabs", async () => {
    const user = userEvent.setup();
    render(<MyOverview />);

    expect(
      await screen.findByRole("heading", { name: "나의 뉴앙" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("첫 성향 검사로 내 뉴앙 코드를 만나보세요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "첫 성향 검사 시작하기" }),
    ).toHaveAttribute(
      "href",
      "/assessments/nu-core-quick?returnTo=%2Fmy%3Ftab%3Dreports",
    );

    expect(
      screen.getByRole("link", {
        name: "로그인 또는 가입",
      }),
    ).toHaveAttribute("href", "/login?next=/my");

    const postsTab = screen.getByRole("tab", { name: /게시물/ });
    const reportsTab = screen.getByRole("tab", { name: /검사 결과/ });
    expect(postsTab).toHaveAttribute("aria-selected", "true");
    postsTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(reportsTab).toHaveFocus();
    expect(reportsTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByText("아직 완료한 검사 결과가 없어요"),
    ).toBeInTheDocument();
  });

  it("shows the operation center only when the server marks the account as admin", async () => {
    const { rerender } = render(<MyOverview />);
    await screen.findByRole("heading", { name: "나의 뉴앙" });
    expect(
      screen.queryByRole("link", { name: "관리자 운영 센터" }),
    ).not.toBeInTheDocument();

    rerender(<MyOverview showAdminEntry />);
    expect(
      screen.getByRole("link", { name: "관리자 운영 센터" }),
    ).toHaveAttribute("href", "/admin");
  });
});

function createCompletedAttempt(): LocalAssessmentAttempt {
  const assessment = candidateFullCoreAssessment;
  const completedAt = "2026-07-19T03:00:00.000Z";
  const responses = Object.fromEntries(
    assessment.items.map((item, index) => [
      item.itemId,
      {
        answeredAt: new Date(
          Date.parse(completedAt) + index * 1000,
        ).toISOString(),
        itemId: item.itemId,
        value: (item.isReverse ? 1 : 5) as 1 | 5,
      },
    ]),
  );
  const draft: LocalAssessmentAttempt = {
    assessmentId: assessment.assessmentId,
    completedAt,
    createdAt: completedAt,
    currentIndex: assessment.items.length - 1,
    expiresAt: "2026-08-19T03:00:00.000Z",
    id: "local-my-overview",
    itemIds: assessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responses,
    state: "completed",
    updatedAt: completedAt,
  };
  const readiness = prepareAssessmentCompletion(assessment, draft);

  return {
    ...draft,
    completionStatus: "completed",
    responseSnapshotHash: readiness.responseSnapshotHash,
    resultCopyVersion: coreResultCopyVersion,
    resultEvidenceStatus: readiness.evidenceStatus,
    resultSnapshot: {
      ...readiness.versionBundle,
      createdAt: completedAt,
      responseSnapshotHash: readiness.responseSnapshotHash,
      resultCopyVersion: coreResultCopyVersion,
      resultStatus: "ready",
      scoreResult: readiness.result,
    },
  };
}

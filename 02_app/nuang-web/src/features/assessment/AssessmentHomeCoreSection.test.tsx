import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import {
  AssessmentHomeCoreSection,
  buildCoreJourneyState,
} from "@/features/assessment/AssessmentHomeCoreSection";
import { prepareAssessmentCompletion } from "@/features/assessment/assessment-completion";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import { coreResultCopyVersion } from "@/features/result/report-copy";

const coreMocks = vi.hoisted(() => ({
  accountResults: [] as AccountResultSummary[],
  attempts: [] as LocalAssessmentAttempt[],
  createFreshLocalAttempt: vi.fn(async () => undefined),
  listLocalAttempts: vi.fn(async () => [] as LocalAssessmentAttempt[]),
  push: vi.fn(),
  readClientAccountResults: vi.fn(async () => ({
    results: [] as AccountResultSummary[],
    state: "ready" as const,
  })),
  synchronizeAccountAssessmentAttempts: vi.fn<() => Promise<unknown>>(
    async () => undefined,
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: coreMocks.push }),
}));

vi.mock("@/features/account/client-account-results", () => ({
  readClientAccountResults: coreMocks.readClientAccountResults,
}));

vi.mock("@/features/assessment/assessment-account-sync", () => ({
  synchronizeAccountAssessmentAttempts:
    coreMocks.synchronizeAccountAssessmentAttempts,
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  createFreshLocalAttempt: coreMocks.createFreshLocalAttempt,
  listLocalAttempts: coreMocks.listLocalAttempts,
}));

beforeEach(() => {
  coreMocks.accountResults = [];
  coreMocks.attempts = [];
  coreMocks.createFreshLocalAttempt.mockClear();
  coreMocks.listLocalAttempts.mockClear();
  coreMocks.listLocalAttempts.mockImplementation(async () =>
    Promise.resolve(coreMocks.attempts),
  );
  coreMocks.push.mockClear();
  coreMocks.readClientAccountResults.mockClear();
  coreMocks.readClientAccountResults.mockImplementation(async () =>
    Promise.resolve({ results: coreMocks.accountResults, state: "ready" }),
  );
  coreMocks.synchronizeAccountAssessmentAttempts.mockClear();
  coreMocks.synchronizeAccountAssessmentAttempts.mockResolvedValue(undefined);
});

describe("buildCoreJourneyState", () => {
  it("prioritizes an in-progress precision assessment over every result", () => {
    const journey = buildCoreJourneyState(
      [
        createAttempt("quick-progress", "nu-core-quick", "in_progress", 1),
        createAttempt("full-complete", "nu-core-full", "completed"),
        createAttempt("full-progress", "nu-core-full", "in_progress", 2),
      ],
      [createAccountResult("full")],
    );

    expect(journey.cta).toBe("3번부터 이어하기");
    expect(journey.progress).toBe(50);
    expect(journey).toMatchObject({
      answeredCount: 2,
      resumeOrdinal: 3,
      resumeSurface: "question",
      totalCount: 4,
    });
    expect(journey.href).toContain("backTo=%2Fhome");
    expect(journey.href).toContain("returnTo=%2Fhome");
  });

  it("prioritizes an in-progress first assessment over completed results", () => {
    const journey = buildCoreJourneyState(
      [
        createAttempt("full-complete", "nu-core-full", "completed"),
        createAttempt("quick-progress", "nu-core-quick", "in_progress", 3),
      ],
      [],
    );

    expect(journey.cta).toBe("4번부터 이어하기");
    expect(journey.href).toBe("/assessments/nu-core-quick?returnTo=%2Fhome");
    expect(journey.progress).toBe(75);
  });

  it("shows a completed precision result before a completed first result", () => {
    const journey = buildCoreJourneyState(
      [createAttempt("quick-complete", "nu-core-quick", "completed")],
      [createAccountResult("full")],
    );

    expect(journey.cta).toBe("탐색적 베타 결과 보기");
    expect(journey.eyebrow).toBe("탐색적 베타 결과");
    expect(journey.description).toContain("대표 코드나 공개·공유·비교");
    expect(
      [journey.cta, journey.description, journey.eyebrow, journey.title].join(
        " ",
      ),
    ).not.toMatch(/내 뉴앙 코드|현재 코드/);
    expect(journey.href).toBe("/results/account/account-full?backTo=%2Fhome");
    expect(journey.secondaryAction).toMatchObject({
      assessmentKind: "full",
      label: "정밀 검사 다시하기",
      type: "restart",
    });
  });

  it("moves a first-result user into precision with the home return contract", () => {
    const journey = buildCoreJourneyState(
      [createAttempt("quick-complete", "nu-core-quick", "completed")],
      [],
    );

    expect(journey.cta).toBe("정밀 성향 검사 시작하기");
    expect(journey.eyebrow).toBe("탐색적 베타 결과");
    expect(journey.title).toContain("이전 베타 결과");
    expect(journey.href).toContain("backTo=%2Fhome");
    expect(journey.href).toContain("returnTo=%2Fhome");
  });

  it("gives a new user one three-minute first-assessment action", () => {
    expect(buildCoreJourneyState([], [])).toMatchObject({
      cta: "첫 성향 검사 시작하기",
      href: "/assessments/nu-core-quick?returnTo=%2Fhome",
      title: "빠르게 뉴앙 코드 알아보기",
    });
  });

  it("describes midpoint, adaptive, and completion surfaces in everyday language", () => {
    const midpoint = createAttempt(
      "midpoint",
      "nu-core-full",
      "in_progress",
      2,
    );
    midpoint.milestones = {
      HALFWAY_BREAK_V1: {
        contentVersion: "v1",
        id: "HALFWAY_BREAK_V1",
        shownAt: midpoint.updatedAt,
        status: "shown",
      },
    };
    expect(buildCoreJourneyState([midpoint], [])).toMatchObject({
      cta: "계속 이어하기",
      resumeSurface: "midpoint",
      title: "중간 쉼표부터 이어가요",
    });

    const adaptiveIntro = createAttempt(
      "adaptive-intro",
      "nu-core-full",
      "in_progress",
      4,
    );
    adaptiveIntro.adaptiveItemIds = ["adaptive-1", "adaptive-2"];
    adaptiveIntro.adaptiveStatus = "intro";
    adaptiveIntro.currentIndex = 4;
    expect(buildCoreJourneyState([adaptiveIntro], [])).toMatchObject({
      cta: "확인 질문 이어가기",
      resumeSurface: "adaptive_intro",
      title: "마지막 확인 질문을 이어가요",
    });

    const adaptiveQuestion = {
      ...adaptiveIntro,
      adaptiveStatus: "in_progress" as const,
      currentIndex: 5,
      responses: {
        ...adaptiveIntro.responses,
        "adaptive-1": {
          answeredAt: adaptiveIntro.updatedAt,
          itemId: "adaptive-1",
          value: 4 as const,
        },
      },
    };
    expect(buildCoreJourneyState([adaptiveQuestion], [])).toMatchObject({
      cta: "확인 질문 2번부터 이어하기",
      progress: 83,
      resumeOrdinal: 2,
      resumeSurface: "adaptive_question",
      title: "확인 질문 2번부터 이어가요",
    });

    const completionPending = {
      ...adaptiveIntro,
      adaptiveStatus: undefined,
      completionStatus: "submitting" as const,
    };
    expect(buildCoreJourneyState([completionPending], [])).toMatchObject({
      cta: "결과 준비 이어가기",
      resumeSurface: "completion_pending",
      title: "답변은 모두 끝났어요",
    });
  });

  it("never lets unknown responses push progress above 100 percent", () => {
    const attempt = createAttempt(
      "bounded-progress",
      "nu-core-quick",
      "in_progress",
      4,
    );
    attempt.responses.unknown = {
      answeredAt: attempt.updatedAt,
      itemId: "unknown",
      value: 5,
    };

    expect(buildCoreJourneyState([attempt], [])).toMatchObject({
      answeredCount: 4,
      progress: 100,
      totalCount: 4,
    });
  });
});

describe("AssessmentHomeCoreSection", () => {
  it("renders the selected journey title as an h2 after loading", async () => {
    coreMocks.attempts = [];
    coreMocks.accountResults = [];

    render(<AssessmentHomeCoreSection />);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "빠르게 뉴앙 코드 알아보기",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "첫 성향 검사 시작하기" }),
    ).toHaveAttribute("href", "/assessments/nu-core-quick?returnTo=%2Fhome");
    expect(
      screen.getByRole("complementary", {
        name: "탐색적 비검증 베타 안내",
      }),
    ).toHaveTextContent("참고용 · 공유 불가");
    expect(
      coreMocks.synchronizeAccountAssessmentAttempts.mock
        .invocationCallOrder[0],
    ).toBeLessThan(coreMocks.listLocalAttempts.mock.invocationCallOrder[0]);
  });

  it("keeps the assessment copy before the right-side illustration slot", async () => {
    const { container } = render(<AssessmentHomeCoreSection />);
    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "빠르게 뉴앙 코드 알아보기",
    });
    const illustration = container.querySelector(
      '[data-illustration-slot="core-assessment-hero"]',
    );

    expect(illustration).not.toBeNull();
    expect(
      heading.compareDocumentPosition(illustration!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(illustration).toHaveAttribute("aria-hidden", "true");
    expect(illustration?.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringContaining("nuang-home-assessment-mascot-v1.webp"),
    );
  });

  it("starts a fresh precision round only after the preservation sheet", async () => {
    coreMocks.accountResults = [createAccountResult("full")];

    render(<AssessmentHomeCoreSection />);

    fireEvent.click(
      await screen.findByRole("button", { name: "정밀 검사 다시하기" }),
    );
    expect(
      screen.getByRole("dialog", { name: "새 결과를 만들어볼까요?" }),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "처음부터 다시 검사하기" }),
    );

    await waitFor(() =>
      expect(coreMocks.createFreshLocalAttempt).toHaveBeenCalledWith(
        candidateFullCoreAssessment,
        "/home",
      ),
    );
    expect(coreMocks.push).toHaveBeenCalledWith(
      expect.stringContaining("/assessments/nu-core-full?"),
    );
  });

  it("groups the primary and restart actions without changing their behavior", async () => {
    coreMocks.accountResults = [createAccountResult("full")];

    render(<AssessmentHomeCoreSection />);

    const actionGroup = await screen.findByRole("group", {
      name: "성향 검사 바로가기",
    });
    expect(actionGroup).toHaveAttribute("data-split", "true");
    expect(
      screen.getByRole("link", { name: "탐색적 베타 결과 보기" }),
    ).toHaveAttribute("href", "/results/account/account-full?backTo=%2Fhome");
    expect(
      screen.getByRole("button", { name: "정밀 검사 다시하기" }),
    ).toBeVisible();
  });

  it("announces a restored cross-device attempt once in the journey card", async () => {
    coreMocks.attempts = [
      createAttempt("restored", "nu-core-quick", "in_progress", 2),
    ];
    coreMocks.synchronizeAccountAssessmentAttempts.mockResolvedValue({
      accountId: "account-1",
      attempts: coreMocks.attempts,
      restoredCount: 1,
      status: "synced",
      uploadedCount: 0,
    });

    render(<AssessmentHomeCoreSection />);

    expect(
      await screen.findByRole("status", {
        name: "",
      }),
    ).toHaveTextContent("다른 기기에서 답하던 내용까지 불러왔어요");
  });
});

function createAttempt(
  id: string,
  assessmentId: "nu-core-full" | "nu-core-quick",
  state: LocalAssessmentAttempt["state"],
  answered = 0,
): LocalAssessmentAttempt {
  if (state === "completed") {
    return createCompletedAttempt(
      assessmentId === "nu-core-full"
        ? candidateFullCoreAssessment
        : candidateQuickCoreAssessment,
      id,
    );
  }

  const itemIds = ["item-1", "item-2", "item-3", "item-4"];
  const responses = Object.fromEntries(
    itemIds.slice(0, answered).map((itemId) => [
      itemId,
      {
        answeredAt: "2026-07-31T00:00:00.000Z",
        itemId,
        value: 3 as const,
      },
    ]),
  );

  return {
    assessmentId,
    createdAt: "2026-07-31T00:00:00.000Z",
    currentIndex: answered,
    expiresAt: "2026-08-31T00:00:00.000Z",
    id,
    itemIds,
    mode: assessmentId === "nu-core-full" ? "full" : "quick",
    releaseId: `${assessmentId}.release`,
    responses,
    state,
    updatedAt:
      state === "in_progress"
        ? "2026-07-31T02:00:00.000Z"
        : "2026-07-31T01:00:00.000Z",
  };
}

function createAccountResult(
  kind: AccountResultSummary["kind"],
): AccountResultSummary {
  const attempt = createCompletedAttempt(
    kind === "full"
      ? candidateFullCoreAssessment
      : candidateQuickCoreAssessment,
    `local-account-${kind}`,
  );
  const snapshot = attempt.resultSnapshot!;

  return {
    alternativeCodes: [...snapshot.scoreResult.alternativeCodes],
    assessmentAttemptId: `attempt-${kind}`,
    completedAt: "2026-07-31T01:30:00.000Z",
    createdAt: "2026-07-31T01:30:00.000Z",
    domains: snapshot.scoreResult.domains.map((domain) => ({ ...domain })),
    facets: snapshot.scoreResult.facets.map((facet) => ({ ...facet })),
    kind,
    localResultId: attempt.id,
    originResultId: attempt.id,
    profileCode: snapshot.scoreResult.code!,
    profileName: snapshot.scoreResult.profileName!,
    reportContentSnapshot: null,
    responseSnapshotHash: snapshot.responseSnapshotHash,
    resultCopyVersion: snapshot.resultCopyVersion,
    resultEvidenceStatus: attempt.resultEvidenceStatus!,
    resultLabel: kind === "full" ? "정밀 성향 결과" : "첫 성향 결과",
    resultReportId: `account-${kind}`,
    resultStatus: "ready",
    versionBundle: {
      assessmentReleaseId: snapshot.assessmentReleaseId,
      codeSchemeVersion: snapshot.codeSchemeVersion,
      scoringModelVersion: snapshot.scoringModelVersion,
      scoringReleaseId: snapshot.scoringReleaseId,
    },
  };
}

function createCompletedAttempt(
  assessment: AssessmentDefinition,
  id: string,
): LocalAssessmentAttempt {
  const completedAt = "2026-07-31T01:00:00.000Z";
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
    expiresAt: "2026-08-31T00:00:00.000Z",
    id,
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

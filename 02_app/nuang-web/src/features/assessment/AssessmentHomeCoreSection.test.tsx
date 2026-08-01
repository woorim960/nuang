import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
}));

vi.mock("@/components/character/NuangCharacter", () => ({
  NuangCharacter: () => <span aria-label="뉴앙 캐릭터" />,
}));

vi.mock("@/features/account/client-account-results", () => ({
  readClientAccountResults: vi.fn(async () => ({
    results: coreMocks.accountResults,
    state: "ready",
  })),
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => coreMocks.attempts),
}));

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

    expect(journey.cta).toBe("정밀 검사 이어하기");
    expect(journey.progress).toBe(50);
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

    expect(journey.cta).toBe("첫 성향 검사 이어하기");
    expect(journey.href).toBe("/assessments/nu-core-quick?returnTo=%2Fhome");
    expect(journey.progress).toBe(75);
  });

  it("shows a completed precision result before a completed first result", () => {
    const journey = buildCoreJourneyState(
      [createAttempt("quick-complete", "nu-core-quick", "completed")],
      [createAccountResult("full")],
    );

    expect(journey.cta).toBe("내 성향 결과 보기");
    expect(journey.eyebrow).toBe("정밀 성향 검사 완료");
    expect(journey.href).toBe("/results/account/account-full?backTo=%2Fhome");
  });

  it("moves a first-result user into precision with the home return contract", () => {
    const journey = buildCoreJourneyState(
      [createAttempt("quick-complete", "nu-core-quick", "completed")],
      [],
    );

    expect(journey.cta).toBe("정밀 성향 검사 시작하기");
    expect(journey.href).toContain("backTo=%2Fhome");
    expect(journey.href).toContain("returnTo=%2Fhome");
  });

  it("gives a new user one three-minute first-assessment action", () => {
    expect(buildCoreJourneyState([], [])).toMatchObject({
      cta: "첫 성향 검사 시작하기",
      href: "/assessments/nu-core-quick?returnTo=%2Fhome",
      title: "3분이면 내 성향의 첫 단서를 만나요",
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
        name: "3분이면 내 성향의 첫 단서를 만나요",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "첫 성향 검사 시작하기" }),
    ).toHaveAttribute("href", "/assessments/nu-core-quick?returnTo=%2Fhome");
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

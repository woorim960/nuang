import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createResponseSnapshotHash } from "@/features/assessment/assessment-completion";
import {
  betaCoreAssessment,
  betaScoringRelease,
} from "@/features/assessment/beta-core-seed";
import {
  candidateQuickCoreAssessment,
  candidateQuickScoringRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import {
  candidateFullCoreAssessment,
  candidateFullScoringRelease,
} from "@/features/assessment/candidate-full-core-seed";
import {
  fullCoreAssessment,
  fullScoringRelease,
} from "@/features/assessment/full-core-seed";
import {
  quickCoreAssessment,
  quickScoringRelease,
} from "@/features/assessment/quick-core-seed";
import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import { LocalResultView } from "@/features/result/LocalResultView";
import { calculateCoreScore } from "@/lib/scoring/core";

const storageMock = vi.hoisted(() => ({
  beginLocalAdaptiveFollowUp: vi.fn(),
  deleteLocalAttempt: vi.fn(),
  getLocalAttempt: vi.fn(),
  reopenLocalAttemptForReview: vi.fn(),
  startLocalAdaptiveFollowUp: vi.fn(),
}));
const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
const fetchMock = vi.fn();

vi.mock("@/features/assessment/assessment-storage", () => ({
  beginLocalAdaptiveFollowUp: storageMock.beginLocalAdaptiveFollowUp,
  deleteLocalAttempt: storageMock.deleteLocalAttempt,
  getLocalAttempt: storageMock.getLocalAttempt,
  reopenLocalAttemptForReview: storageMock.reopenLocalAttemptForReview,
  startLocalAdaptiveFollowUp: storageMock.startLocalAdaptiveFollowUp,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

describe("LocalResultView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: null }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    storageMock.startLocalAdaptiveFollowUp.mockImplementation(
      async (attempt, adaptiveItemIds) => ({
        ...attempt,
        adaptiveItemIds,
        adaptiveStatus: "intro" as const,
      }),
    );
    storageMock.beginLocalAdaptiveFollowUp.mockImplementation(
      async (attempt) => ({
        ...attempt,
        adaptiveStatus: "in_progress" as const,
      }),
    );
    storageMock.reopenLocalAttemptForReview.mockImplementation(
      async (attempt, currentIndex) => ({
        ...attempt,
        adaptiveItemIds: undefined,
        adaptiveStatus: undefined,
        completionStatus: undefined,
        currentIndex,
        resultSnapshot: undefined,
        state: "in_progress" as const,
      }),
    );
  });

  it("surfaces the result action deck for a full core result", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(fullCoreAssessment),
    );

    render(<LocalResultView localResultId="local_full" />);

    expect(
      await screen.findByRole("region", { name: "결과 활용" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "다음으로" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "성향지도 열기" })).toHaveAttribute(
      "href",
      "/map",
    );
    expect(screen.getByRole("link", { name: "내 리포트" })).toHaveAttribute(
      "href",
      "/my/reports",
    );
    expect(
      screen.getByRole("link", { name: "공개 범위 설정" }),
    ).toHaveAttribute("href", "/my/settings/visibility");
    expect(
      screen.getByRole("img", { name: "코드 지도 그래프" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "세부 신호 그래프" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "결과 이미지 파일로 저장하거나 기기 공유 시트 열기",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "결과 삭제" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/계정 저장|이 기기에 저장|로컬 결과/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/문구 v/)).not.toBeInTheDocument();
    expect(screen.queryByText(/내부 QA/)).not.toBeInTheDocument();
  });

  it("guides quick core results toward the full core extension", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(quickCoreAssessment),
    );

    render(<LocalResultView localResultId="local_quick" />);

    expect(
      await screen.findByText("내 성향 더 자세히 알아보기"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "정밀 성향 검사 소개 열기" }),
    ).toHaveAttribute(
      "href",
      "/assessments/nu-core-full?from=first-result&backTo=%2Fresults%2Flocal%2Flocal_quick",
    );
  });

  it("connects an eligible signed-in result in the background", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(fullCoreAssessment),
    );
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          analytics: false,
          marketing: false,
          privacy: true,
          terms: true,
        }),
      ),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: null }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: {
              restored: false,
              resultReportId: "22222222-2222-4222-8222-222222222222",
            },
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    render(<LocalResultView localResultId="local_full" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/claim-result",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(
      await screen.findByRole("button", { name: "공유 주소 복사" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "피드에 공유" }),
    ).toBeInTheDocument();
    const claimCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/claim-result" && init?.method === "POST",
    );
    const claimBody = JSON.parse(String(claimCall?.[1]?.body));

    expect(claimBody.resultSummary.facets).toHaveLength(10);
    expect(claimBody.resultSummary.facets[0]).toMatchObject({
      facetId: expect.any(String),
      label: expect.any(String),
      score: expect.any(Number),
      status: expect.stringMatching(/valid|partial|insufficient/),
    });
    expect(screen.queryByText(/계정에 저장/)).not.toBeInTheDocument();
  });

  it("shows the generated share address when clipboard copy is blocked", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard blocked"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(fullCoreAssessment),
    );
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          analytics: false,
          marketing: false,
          privacy: true,
          terms: true,
        }),
      ),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: null }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: {
              resultReportId: "22222222-2222-4222-8222-222222222222",
            },
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            shareLink: {
              expiresAt: "2026-08-09T00:00:00.000Z",
              id: "33333333-3333-4333-8333-333333333333",
              url: "http://localhost:3000/share/public-token",
            },
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    render(<LocalResultView localResultId="local_full" />);

    await user.click(
      await screen.findByRole("button", { name: "공유 주소 복사" }),
    );

    expect(writeText).toHaveBeenCalledWith(
      "http://localhost:3000/share/public-token",
    );
    expect(
      await screen.findByText(
        "공유 주소가 준비됐어요. 위 주소를 길게 눌러 복사할 수 있어요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/http:\/\/localhost:3000\/share\/public-token/),
    ).toBeInTheDocument();
  });

  it("restores saved report status without exposing share management", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(fullCoreAssessment),
    );
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          result: {
            activeShareLinkCount: 2,
            activeShareLinks: [
              {
                expiresAt: "2026-08-07T00:00:00.000Z",
                id: "33333333-3333-4333-8333-333333333333",
              },
              {
                expiresAt: "2026-08-01T00:00:00.000Z",
                id: "44444444-4444-4444-8444-444444444444",
              },
            ],
            assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
            claimedAt: "2026-07-08T00:00:00.000Z",
            latestShareExpiresAt: "2026-08-07T00:00:00.000Z",
            profileCode: "TVOAE",
            profileName: "불꽃의 온기 탐험가",
            resultReportId: "22222222-2222-4222-8222-222222222222",
          },
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );

    render(<LocalResultView localResultId="local_full" />);

    expect(
      await screen.findByRole("button", { name: "공유 주소 복사" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "피드에 공유" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/활성 공유 링크/)).not.toBeInTheDocument();
    expect(screen.queryByText("공유 링크 관리")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/계정에 저장|이 기기|로컬 결과/),
    ).not.toBeInTheDocument();
  });

  it("does not recalculate, claim, or share a result without its versioned snapshot", async () => {
    const legacyAttempt = buildCompletedAttempt(quickCoreAssessment);
    delete legacyAttempt.resultSnapshot;
    storageMock.getLocalAttempt.mockResolvedValue(legacyAttempt);

    render(<LocalResultView localResultId="local_quick" />);

    expect(
      await screen.findByRole("heading", {
        name: "이 결과는 현재 버전에서 다시 열 수 없어요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("-----")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /공유/ }),
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url === "/api/claim-result" && init?.method === "POST",
      ),
    ).toBe(false);
  });

  it("blocks a result when its response hash or supported release versions do not match", async () => {
    const corrupted = buildCompletedAttempt(quickCoreAssessment);
    corrupted.resultSnapshot = {
      ...corrupted.resultSnapshot!,
      responseSnapshotHash: "different_snapshot",
    };
    storageMock.getLocalAttempt.mockResolvedValue(corrupted);

    render(<LocalResultView localResultId="local_quick" />);

    expect(
      await screen.findByRole("heading", {
        name: "이 결과는 현재 버전에서 다시 열 수 없어요",
      }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url === "/api/claim-result" && init?.method === "POST",
      ),
    ).toBe(false);
  });

  it("does not reinterpret an unsupported scoring release", async () => {
    const unsupported = buildCompletedAttempt(quickCoreAssessment);
    unsupported.resultSnapshot = {
      ...unsupported.resultSnapshot!,
      scoringModelVersion: "UNSUPPORTED-SCORING-MODEL",
    };
    storageMock.getLocalAttempt.mockResolvedValue(unsupported);

    render(<LocalResultView localResultId="local_quick" />);

    expect(
      await screen.findByRole("heading", {
        name: "이 결과는 현재 버전에서 다시 열 수 없어요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /공유/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the candidate 5-code report without any sharing surface or side effect", async () => {
    const user = userEvent.setup();
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(betaCoreAssessment),
    );

    render(<LocalResultView localResultId="local_beta" />);

    expect(
      await screen.findByRole("heading", {
        name: "관계를 여는 지휘자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(
      screen.queryByRole("button", { name: /공유|카카오|피드/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /공유/ }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "이 결과는 어떻게 봐야 하나요?" }),
    );
    expect(
      screen.getByText(/능력이나 좋고 나쁨, 정신건강을 판단하지 않아요/),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          String(url).includes("claim-result") ||
          String(url).includes("share") ||
          String(url).includes("feed"),
      ),
    ).toBe(false);
  });

  it("opens a completed candidate quick result in the new five-code report", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateQuickCoreAssessment),
    );

    render(<LocalResultView localResultId="local_candidate_quick" />);

    expect(
      await screen.findByRole("heading", {
        name: "관계를 여는 지휘자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("claim-result"),
      ),
    ).toBe(false);
  });

  it("opens a completed candidate precision result as the finished full flow", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateFullCoreAssessment),
    );

    render(<LocalResultView localResultId="local_candidate_full" />);

    expect(
      await screen.findByRole("heading", {
        name: "관계를 여는 지휘자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
  });

  it("withholds a candidate report when any code position is centered", async () => {
    const user = userEvent.setup();
    const attempt = buildUndeterminedBetaAttempt();
    delete attempt.completionStatus;
    delete attempt.resultCopyVersion;
    delete attempt.resultEvidenceStatus;
    delete attempt.resultSnapshot;
    storageMock.getLocalAttempt.mockResolvedValue(attempt);

    render(<LocalResultView localResultId="local_beta_centered" />);

    expect(
      await screen.findByRole("heading", {
        name: "비슷하게 나온 코드만 조금 더 확인할게요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("ENAKQ")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "추가 질문 이어가기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "나중에 이어하기" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "추가 질문 이어가기" }),
    );
    expect(storageMock.startLocalAdaptiveFollowUp).toHaveBeenCalledWith(
      attempt,
      betaCoreAssessment.adaptiveItems!.map((item) => item.itemId),
    );
    expect(storageMock.beginLocalAdaptiveFollowUp).toHaveBeenCalledTimes(1);
    expect(routerMock.replace).toHaveBeenCalledWith(
      "/assessments/nu-core-full?preview=beta-v1",
    );
  });

  it("withholds a report and reopens base questions for one repeated answer pattern", async () => {
    const user = userEvent.setup();
    const attempt = buildCompletedAttempt(betaCoreAssessment);
    for (const item of betaCoreAssessment.items) {
      attempt.responses[item.itemId] = {
        answeredAt: attempt.updatedAt,
        itemId: item.itemId,
        value: 5,
      };
    }
    storageMock.getLocalAttempt.mockResolvedValue(attempt);

    render(<LocalResultView localResultId="local_beta_uniform" />);

    expect(
      await screen.findByRole("heading", {
        name: "답을 한 번만 더 살펴봐 주세요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "답 다시 살펴보기" }));
    expect(storageMock.reopenLocalAttemptForReview).toHaveBeenCalledWith(
      attempt,
      0,
    );
    expect(routerMock.replace).toHaveBeenCalledWith(
      "/assessments/nu-core-full?preview=beta-v1",
    );
  });
});

function buildCompletedAttempt(
  assessment: AssessmentDefinition,
): LocalAssessmentAttempt {
  const now = new Date("2026-07-08T00:00:00.000Z").toISOString();
  const responses = Object.fromEntries(
    assessment.items.map((item) => [
      item.itemId,
      {
        answeredAt: now,
        isUnsure: false,
        itemId: item.itemId,
        value:
          assessment.assessmentId === betaCoreAssessment.assessmentId ||
          assessment.releaseId === candidateQuickCoreAssessment.releaseId ||
          assessment.releaseId === candidateFullCoreAssessment.releaseId
            ? item.isReverse
              ? (1 as const)
              : (5 as const)
            : (4 as const),
      },
    ]),
  );
  const scoringRelease =
    assessment.assessmentId === betaCoreAssessment.assessmentId
      ? betaScoringRelease
      : assessment.releaseId === candidateQuickCoreAssessment.releaseId
        ? candidateQuickScoringRelease
        : assessment.releaseId === candidateFullCoreAssessment.releaseId
          ? candidateFullScoringRelease
      : assessment.mode === "full"
        ? fullScoringRelease
        : quickScoringRelease;
  const scoreResult = calculateCoreScore(
    scoringRelease,
    Object.values(responses),
  );

  const attempt: LocalAssessmentAttempt = {
    assessmentId: assessment.assessmentId,
    completionRequestId: "completion_test",
    completionStatus: "completed",
    completedAt: now,
    createdAt: now,
    currentIndex: assessment.items.length - 1,
    expiresAt: new Date("2026-08-07T00:00:00.000Z").toISOString(),
    id: `local_${assessment.assessmentId}`,
    itemIds: assessment.items.map((item) => item.itemId),
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responseSnapshotHash: "pending",
    responses,
    resultCopyVersion: "core-result-copy.v0.1",
    resultEvidenceStatus: "clear",
    resultSnapshot: {
      assessmentReleaseId: assessment.releaseId,
      codeSchemeVersion: scoringRelease.codeSchemeVersion,
      createdAt: now,
      responseSnapshotHash: "pending",
      resultCopyVersion: "core-result-copy.v0.1",
      resultStatus: "ready",
      scoreResult,
      scoringModelVersion: scoringRelease.scoringModelVersion,
      scoringReleaseId: scoringRelease.scoringReleaseId,
    },
    state: "completed",
    updatedAt: now,
  };

  const responseSnapshotHash = createResponseSnapshotHash(assessment, attempt);
  attempt.responseSnapshotHash = responseSnapshotHash;
  attempt.resultSnapshot!.responseSnapshotHash = responseSnapshotHash;

  return attempt;
}

function buildUndeterminedBetaAttempt() {
  const attempt = buildCompletedAttempt(betaCoreAssessment);
  const indexByDomain = new Map<string, number>();
  const centeredResponses = Object.fromEntries(
    betaCoreAssessment.items.map((item) => {
      const domainIndex = indexByDomain.get(item.domainId) ?? 0;
      indexByDomain.set(item.domainId, domainIndex + 1);
      const scoresHigh = domainIndex % 2 === 0;

      return [
        item.itemId,
        {
          answeredAt: attempt.updatedAt,
          isUnsure: false,
          itemId: item.itemId,
          value: scoresHigh
            ? item.isReverse
              ? (1 as const)
              : (5 as const)
            : item.isReverse
              ? (5 as const)
              : (1 as const),
        },
      ];
    }),
  );
  const scoreResult = calculateCoreScore(
    betaScoringRelease,
    Object.values(centeredResponses),
  );

  attempt.responses = centeredResponses;
  attempt.resultEvidenceStatus = "near_boundary";
  attempt.resultSnapshot!.scoreResult = scoreResult;
  const responseSnapshotHash = createResponseSnapshotHash(
    betaCoreAssessment,
    attempt,
  );
  attempt.responseSnapshotHash = responseSnapshotHash;
  attempt.resultSnapshot!.responseSnapshotHash = responseSnapshotHash;

  return attempt;
}

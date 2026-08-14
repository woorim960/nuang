import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { candidateFullScoringRelease } from "@/features/assessment/candidate-full-core-seed";
import { AccountResultView } from "@/features/result/AccountResultView";

const fetchMock = vi.fn();
const routerMock = vi.hoisted(() => ({
  replace: vi.fn(),
}));
const storageMock = vi.hoisted(() => ({
  deleteLocalAttempt: vi.fn(),
}));
const authScopeMock = vi.hoisted(() => ({
  currentUserId: "auth-user-a" as string | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  deleteLocalAttempt: storageMock.deleteLocalAttempt,
}));

vi.mock("@/features/result-persistence/client-result-scope", () => ({
  readCurrentSupabaseUserId: vi.fn(async () => authScopeMock.currentUserId),
  verifyStableResultAuthScope: vi.fn(
    async ({
      requestUserId,
      responseUserId,
    }: {
      requestUserId: string | null;
      responseUserId?: string | null;
    }) =>
      requestUserId &&
      requestUserId === responseUserId &&
      requestUserId === authScopeMock.currentUserId
        ? requestUserId
        : null,
  ),
}));

describe("AccountResultView", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    routerMock.replace.mockReset();
    storageMock.deleteLocalAttempt.mockReset();
    storageMock.deleteLocalAttempt.mockResolvedValue(undefined);
    authScopeMock.currentUserId = "auth-user-a";
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          ok: true,
          results: [
            {
              assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
              completedAt: "2026-07-09T00:00:00.000Z",
              createdAt: "2026-07-09T00:00:00.000Z",
              domains: [
                {
                  domainId: "SE",
                  label: "사람 사이 에너지",
                  score: 72,
                  symbol: "T",
                },
                {
                  domainId: "ER",
                  label: "마음의 반응",
                  score: 64,
                  symbol: "V",
                },
                {
                  domainId: "SM",
                  label: "일상 리듬",
                  score: 68,
                  symbol: "O",
                },
                {
                  domainId: "RO",
                  label: "관계 방식",
                  score: 58,
                  symbol: "A",
                },
                {
                  domainId: "OE",
                  label: "감각과 생각",
                  score: 66,
                  symbol: "E",
                },
              ],
              facets: [
                {
                  facetId: "SE_SOC",
                  label: "외향 리듬",
                  score: 72,
                  status: "valid",
                },
              ],
              kind: "full",
              localResultId: "local_test_123",
              profileCode: "TVOAE",
              profileName: "불꽃의 온기 탐험가",
              resultLabel: "현재 대표 성향",
              resultReportId: "22222222-2222-4222-8222-222222222222",
            },
          ],
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("routes an unsupported legacy account result to the common unavailable state", async () => {
    render(
      <AccountResultView resultReportId="22222222-2222-4222-8222-222222222222" />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "이 결과는 지금 화면에서 온전히 열기 어려워요",
      }),
    ).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", {
      name: "이전 화면으로 돌아가기",
    })) {
      expect(link).toHaveAttribute("href", "/my/reports/history");
    }
  });

  it("renders a current account result through the same unified template", () => {
    render(
      <AccountResultView
        initialResult={buildCurrentAccountResult()}
        resultReportId="22222222-2222-4222-8222-222222222222"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "관계를 여는 선도자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("tablist", { name: "뉴앙 코드 자리 선택" }),
      ).getAllByRole("tab"),
    ).toHaveLength(5);
    expect(
      screen.getByRole("heading", { name: "이번 답에서 특히 눈에 띈 모습" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 결과 삭제" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/계정 결과|로컬 결과/)).not.toBeInTheDocument();
  });

  it("deletes the merged local copy even when the server omits its id", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          ok: true,
          result: { localResultId: null },
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <AccountResultView
        initialResult={buildCurrentAccountResult()}
        resultReportId="22222222-2222-4222-8222-222222222222"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "이 결과 삭제" }));

    await waitFor(() =>
      expect(storageMock.deleteLocalAttempt).toHaveBeenCalledWith(
        "local-current",
      ),
    );
    expect(routerMock.replace).toHaveBeenCalledWith("/my/reports/history");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account-results",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-nuang-auth-user-id": "auth-user-a",
        }),
      }),
    );
  });

  it("keeps the local copy when the authenticated user changes during deletion", async () => {
    fetchMock.mockImplementationOnce(async () => {
      authScopeMock.currentUserId = "auth-user-b";
      return new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          ok: true,
          result: { localResultId: "local-current" },
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <AccountResultView
        initialResult={buildCurrentAccountResult()}
        resultReportId="22222222-2222-4222-8222-222222222222"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "이 결과 삭제" }));

    expect(
      await screen.findByText(/결과를 삭제하지 못했어요/),
    ).toBeInTheDocument();
    expect(storageMock.deleteLocalAttempt).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});

function buildCurrentAccountResult(): AccountResultSummary {
  const code = "ENAKQ";
  return {
    alternativeCodes: [],
    assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
    completedAt: "2026-07-31T00:00:00.000Z",
    createdAt: "2026-07-31T00:00:00.000Z",
    domains: candidateFullScoringRelease.domains.map((domain) => ({
      domainId: domain.domainId,
      isBoundary: false,
      label: domain.label,
      score: 70,
      status: "valid" as const,
      symbol: code[(domain.codePosition ?? 1) - 1],
    })),
    facets: candidateFullScoringRelease.facets.map((facet) => ({
      facetId: facet.facetId,
      label: facet.label,
      score: 70,
      status: "valid" as const,
      validResponses: Math.max(1, facet.minValidResponses),
    })),
    kind: "full",
    localResultId: "local-current",
    originResultId: "local-current",
    profileCode: code,
    profileName: "관계를 여는 선도자",
    reportContentSnapshot: null,
    responseSnapshotHash: "fnv1a32x2:current-account",
    resultCopyVersion: "candidate-result-copy.v1",
    resultEvidenceStatus: "clear",
    resultLabel: "정밀 성향 결과",
    resultReportId: "22222222-2222-4222-8222-222222222222",
    resultStatus: "ready",
    versionBundle: {
      assessmentReleaseId: candidateFullScoringRelease.assessmentReleaseId,
      codeSchemeVersion: candidateFullScoringRelease.codeSchemeVersion,
      scoringModelVersion: candidateFullScoringRelease.scoringModelVersion,
      scoringReleaseId: candidateFullScoringRelease.scoringReleaseId,
    },
  };
}

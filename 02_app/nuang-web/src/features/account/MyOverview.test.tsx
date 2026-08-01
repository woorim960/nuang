import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MyOverview } from "@/features/account/MyOverview";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { candidateFullScoringRelease } from "@/features/assessment/candidate-full-core-seed";

const myOverviewMocks = vi.hoisted(() => ({
  authUser: { id: "auth-user" } as { id: string } | null,
  localAttempts: [] as unknown[],
}));

vi.mock("@/components/character/NuangCharacter", () => ({
  NuangCharacter: () => <span aria-label="뉴앙 캐릭터" />,
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => myOverviewMocks.localAttempts),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () =>
    myOverviewMocks.authUser
      ? {
          auth: {
            getUser: async () => ({
              data: { user: myOverviewMocks.authUser },
            }),
          },
        }
      : null,
}));

describe("MyOverview", () => {
  afterEach(() => {
    myOverviewMocks.authUser = { id: "auth-user" };
    myOverviewMocks.localAttempts = [];
    vi.unstubAllGlobals();
  });

  it("puts the latest identity and core personal routes first", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: true,
              results: [createAccountResult()],
            }),
            { status: 200 },
          ),
      ),
    );

    render(<MyOverview />);

    expect(await screen.findByText("INGMC")).toBeInTheDocument();
    expect(screen.getByText("새 가능성을 찾는 탐험가")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 성향 보기" })).toHaveAttribute(
      "href",
      "/my/reports",
    );
    expect(screen.getByRole("link", { name: "최신 리포트" })).toHaveAttribute(
      "href",
      "/my/reports",
    );
    expect(
      screen.getByRole("link", { name: "성향 놀이터 기록" }),
    ).toHaveAttribute("href", "/feed/perspectives?from=my");
    expect(screen.getByRole("link", { name: "내 게시물" })).toHaveAttribute(
      "href",
      "/feed/me",
    );
    expect(screen.getByRole("link", { name: "의견 보내기" })).toHaveAttribute(
      "href",
      "/my/feedback?from=%2Fmy",
    );
  });

  it("gives a first-time viewer one clear assessment action", async () => {
    myOverviewMocks.authUser = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true, results: [] }), {
            status: 200,
          }),
      ),
    );

    render(<MyOverview />);

    expect(
      await screen.findByText("내 뉴앙 코드를 만나보세요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "첫 성향 검사 시작하기" }),
    ).toHaveAttribute("href", "/home");

    await waitFor(() => {
      expect(
        screen.getByRole("link", {
          name: "로그인 또는 가입",
        }),
      ).toHaveAttribute("href", "/login?next=/my");
    });
  });

  it("shows the operation center only when the server marks the account as admin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true, results: [] }), {
            status: 200,
          }),
      ),
    );

    const { rerender } = render(<MyOverview />);
    expect(
      screen.queryByRole("link", { name: "관리자 운영 센터" }),
    ).not.toBeInTheDocument();

    rerender(<MyOverview showAdminEntry />);
    expect(
      screen.getByRole("link", { name: "관리자 운영 센터" }),
    ).toHaveAttribute("href", "/admin");
  });
});

function createAccountResult(): AccountResultSummary {
  const profileCode = "INGMC";
  return {
    alternativeCodes: [],
    assessmentAttemptId: "attempt-account",
    completedAt: "2026-07-19T03:00:00.000Z",
    createdAt: "2026-07-19T03:00:00.000Z",
    domains: candidateFullScoringRelease.domains.map((domain) => ({
      domainId: domain.domainId,
      isBoundary: false,
      label: domain.label,
      score: 70,
      status: "valid" as const,
      symbol: profileCode[(domain.codePosition ?? 1) - 1],
    })),
    facets: candidateFullScoringRelease.facets.map((facet) => ({
      facetId: facet.facetId,
      label: facet.label,
      score: 70,
      status: "valid" as const,
      validResponses: Math.max(1, facet.minValidResponses),
    })),
    kind: "full",
    localResultId: null,
    originResultId: "origin-account-result",
    profileCode,
    profileName: "새 가능성을 찾는 탐험가",
    resultLabel: "현재 가장 가까운 대표 성향",
    resultCopyVersion: "candidate-result-copy.v1",
    resultEvidenceStatus: "clear",
    resultReportId: "4292e0e7-0353-43f0-9132-f90149badee5",
    resultStatus: "ready",
    versionBundle: {
      assessmentReleaseId: candidateFullScoringRelease.assessmentReleaseId,
      codeSchemeVersion: candidateFullScoringRelease.codeSchemeVersion,
      scoringModelVersion: candidateFullScoringRelease.scoringModelVersion,
      scoringReleaseId: candidateFullScoringRelease.scoringReleaseId,
    },
  };
}
